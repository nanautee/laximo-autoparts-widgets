import { handler } from '../frontend/lib/api/handler.mjs';
import vercelHandler from '../frontend/api/index.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let passed = 0;
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok   ${name}`); }
  catch (e) { console.log(`  FAIL ${name} -> ${e.message}`); process.exitCode = 1; }
};

const call = async (httpMethod, url, body) => {
  const [pathname, search = ''] = url.split('?');
  const res = await handler({
    httpMethod, path: pathname, rawQueryString: search,
    body: body === undefined ? null : JSON.stringify(body), isBase64Encoded: false,
  });
  return { status: res.statusCode, body: JSON.parse(res.body) };
};

(async () => {
  const fixture = JSON.parse(readFileSync(new URL('../frontend/lib/api/_fixture.json', import.meta.url), 'utf8'));

  console.log('fixture integrity');
  check('every catalogTemplate key is reachable from ROOT', () => {
    const seen = new Set(['ROOT']);
    const queue = ['ROOT'];
    while (queue.length) {
      const cur = queue.shift();
      for (const node of fixture.catalogTemplate[cur] ?? []) {
        if (node.kind === 'GROUP' && !seen.has(node.id)) { seen.add(node.id); queue.push(node.id); }
      }
    }
    for (const key of Object.keys(fixture.catalogTemplate)) {
      assert.ok(seen.has(key), `unreachable level: ${key}`);
    }
  });
  check('vinIndex targets exist in vehicleList', () => {
    for (const [vin, vid] of Object.entries(fixture.vinIndex)) {
      assert.equal(vin.length, 17, `bad VIN length: ${vin}`);
      assert.ok(fixture.vehicleList.some((v) => v.vehicleId === vid), `dangling ${vin} -> ${vid}`);
    }
  });
  check('no I/O/Q in indexed VINs', () => {
    for (const vin of Object.keys(fixture.vinIndex)) assert.ok(!/[IOQ]/.test(vin), vin);
  });
  check('models reference real brands', () => {
    const brandIds = new Set(fixture.brands.map((b) => b.id));
    for (const [brandId, models] of Object.entries(fixture.models)) {
      assert.ok(brandIds.has(brandId), `unknown brand ${brandId}`);
      for (const m of models) assert.equal(m.brandId, brandId);
    }
  });
  check('modifications reference real models', () => {
    const modelIds = new Set(Object.values(fixture.models).flat().map((m) => m.id));
    for (const [modelId, mods] of Object.entries(fixture.modifications)) {
      assert.ok(modelIds.has(modelId), `unknown model ${modelId}`);
      for (const mod of mods) assert.equal(mod.modelId, modelId);
    }
  });
  check('oemIndex keys are normalized', () => {
    for (const key of Object.keys(fixture.oemIndex)) {
      assert.equal(key, key.replace(/[^A-Z0-9]/g, ''), key);
    }
  });

  console.log('decoded prices scale per vehicle');
  const a = await call('GET', '/api/v1/vehicles/VF-318I-2008/catalog?groupId=g-elec-modules');
  const b = await call('GET', '/api/v1/vehicles/VF-C200-2012/catalog?groupId=g-elec-modules');
  check('two vehicles return different prices for the same part', () => {
    const pa = a.body.groups[0].price;
    const pb = b.body.groups[0].price;
    assert.notEqual(pa, pb, `both ${pa}`);
  });

  console.log('error handling');
  const nf = await call('GET', '/api/v1/nope');
  check('unknown route returns 404 NOT_FOUND', () => assert.equal(nf.status, 404));

  const bad = await call('GET', '/api/v1/vehicles/decode?vin=');
  check('empty vin -> 400 VIN_REQUIRED', () => {
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'VIN_REQUIRED');
  });

  const method = await call('DELETE', '/api/v1/meta');
  check('wrong method -> 404', () => assert.equal(method.status, 404));

  const health = await call('GET', '/api/v1/health');
  check('health returns UP', () => assert.equal(health.body.status, 'UP'));

  console.log('vercel route shapes');
  // Rewrite mode: event.path collapses to the rewrite target and the real
  // route arrives in the `path` query parameter. This shape silently 404'd.
  const rewritten = async (method, url, body) => {
    const [pathname, search = ''] = url.split('?');
    const suffix = pathname.replace(/^\/api\/?/, '');
    const params = Object.fromEntries(new URLSearchParams(search));
    const res = await handler({
      httpMethod: method, path: '/api/handler', rawQueryString: search,
      queryStringParameters: { ...params, ...(suffix ? { path: suffix } : {}) },
      body: body === undefined ? null : JSON.stringify(body), isBase64Encoded: false,
    });
    return { status: res.statusCode, body: JSON.parse(res.body) };
  };

  const rMeta = await rewritten('GET', '/api/v1/meta');
  check('rewrite: /api/v1/meta is not 404', () => {
    assert.notEqual(rMeta.status, 404);
    assert.equal(rMeta.status, 200);
  });

  const rHealth = await rewritten('GET', '/api/v1/health');
  check('rewrite: /api/v1/health returns UP', () => assert.equal(rHealth.body.status, 'UP'));

  const rVin = await rewritten('GET', '/api/v1/vehicles/decode?vin=1HGBH41JXMN109186');
  check('rewrite: nested route keeps original query params', () => {
    assert.equal(rVin.status, 200);
    assert.ok(rVin.body.vehicle, 'vehicle must be resolved from the vin param');
  });

  const rOem = await rewritten('GET', '/api/v1/oem/search?number=5556597375');
  check('rewrite: oem search resolves', () => {
    assert.equal(rOem.status, 200);
    assert.ok(rOem.body.result);
  });

  const rCatalog = await rewritten('GET', '/api/v1/vehicles/1HGBH41JXMN109186/catalog');
  check('rewrite: catalog resolves', () => {
    assert.equal(rCatalog.status, 200);
    assert.ok(rCatalog.body.groups);
  });

  const rRoot = await rewritten('GET', '/api');
  check('rewrite: bare /api is handled, not a crash', () => {
    assert.ok(rRoot.status === 200 || rRoot.status === 404);
    assert.ok(rRoot.body.code !== 'INTERNAL_ERROR');
  });

  // Native catch-all mode: event.path is truthful, `path` arrives as an array.
  const caught = await handler({
    httpMethod: 'GET', path: '/api/v1/meta', rawQueryString: '',
    queryStringParameters: { path: ['v1', 'meta'] },
    body: null, isBase64Encoded: false,
  });
  check('catch-all: array path param resolves', () => assert.equal(caught.statusCode, 200));

  console.log('vercel runtime contract');
  // Vercel's Node runtime only completes a request once res.end() is called.
  // An entrypoint that merely returns a value hangs until the 300s timeout.
  const { Readable } = await import('node:stream');
  const invoke = async (method, url, body) => {
    const parsed = new URL(url, 'http://localhost');
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    req.query = { ...Object.fromEntries(parsed.searchParams) };
    if (url.startsWith('/api/handler?path=') || url.startsWith('/api/index?path=')) {
      req.path = undefined;
    }
    let ended = false;
    let payload = null;
    const res = {
      statusCode: 0,
      setHeader() {},
      end(chunk) { ended = true; payload = chunk; },
    };
    // The rewrite target must arrive as the pathname, with the route in ?path=.
    if (parsed.pathname === '/api/handler' || parsed.pathname === '/api/index') {
      req.url = url;
    }
    await vercelHandler(req, res);
    return { ended, status: res.statusCode, body: payload === null ? null : JSON.parse(payload) };
  };

  const vHealth = await invoke('GET', '/api/index?path=v1/health');
  check('entrypoint ends the response (no 300s hang)', () => {
    assert.equal(vHealth.ended, true, 'res.end() was never called');
  });
  check('entrypoint returns 200 UP', () => {
    assert.equal(vHealth.status, 200);
    assert.equal(vHealth.body.status, 'UP');
  });

  const vVin = await invoke('GET', '/api/index?path=v1/vehicles/decode&vin=1HGBH41JXMN109186');
  check('entrypoint resolves VIN through the rewrite param', () => {
    assert.equal(vVin.ended, true);
    assert.equal(vVin.status, 200);
    assert.ok(vVin.body.vehicle);
  });

  const vCart = await invoke('POST', '/api/index?path=v1/cart/add', {
    vehicleId: '1HGBH41JXMN109186', partNumber: '5556597375', quantity: 2,
  });
  check('entrypoint reads a POST body and responds', () => {
    assert.equal(vCart.ended, true);
    assert.ok(vCart.status === 200 || vCart.status === 400, `status ${vCart.status}`);
  });

  const vMissing = await invoke('GET', '/api/index?path=v1/nope');
  check('entrypoint maps unknown routes to a JSON 404', () => {
    assert.equal(vMissing.ended, true);
    assert.equal(vMissing.status, 404);
    assert.equal(vMissing.body.code, 'NOT_FOUND');
  });

  console.log(`\n${passed} passed`);
})();

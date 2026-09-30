import { handler } from '../frontend/api/handler.mjs';
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
  const fixture = JSON.parse(readFileSync(new URL('../frontend/api/_fixture.json', import.meta.url), 'utf8'));

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

  console.log(`\n${passed} passed`);
})();

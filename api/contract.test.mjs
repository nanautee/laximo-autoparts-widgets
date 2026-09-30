import assert from 'node:assert/strict';
import { handler } from '../frontend/api/handler.mjs';

const BASE = 'http://localhost:8080';

const call = async (method, path, body) => {
  const [pathname, search = ''] = path.split('?');
  const event = {
    httpMethod: method,
    path: pathname,
    rawQueryString: search,
    body: body === undefined ? null : JSON.stringify(body),
    isBase64Encoded: false,
  };
  const res = await handler(event);
  return { status: res.statusCode, headers: res.headers, body: JSON.parse(res.body) };
};

let passed = 0;
let failed = 0;
const check = (name, condition, detail) => {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.log(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`); }
};

const headersToObject = (headers) => {
  const out = {};
  for (const [k, v] of headers) out[k] = v;
  return out;
};

const getJson = async (path) => {
  const r = await fetch(BASE + path);
  return { status: r.status, headers: headersToObject(r.headers), body: await r.json() };
};
const postJson = async (path, body) => {
  const r = await fetch(BASE + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, headers: headersToObject(r.headers), body: await r.json() };
};

const CASES = [
  ['GET', '/api/v1/meta'],
  ['GET', '/api/v1/cart/status'],
  ['GET', '/api/v1/catalog/brands'],
  ['GET', '/api/v1/catalog/brands?q=bmw'],
  ['GET', '/api/v1/catalog/brands/L-201/models'],
  ['GET', '/api/v1/catalog/models/MD-3-series/modifications'],
  ['GET', '/api/v1/vehicles/decode?vin=WBAVA51070FH12345'],
  ['GET', '/api/v1/vehicles/decode?vin=ZZZZZZZZZZZZZZZZ9'],
  ['GET', '/api/v1/vehicles/decode?vin=SHORT'],
  ['GET', '/api/v1/vehicles/decode?vin=WBA8B11060F12345I'],
  ['GET', '/api/v1/vehicles/VF-318I-2008/catalog'],
  ['GET', '/api/v1/vehicles/VF-318I-2008/catalog?groupId=g-engine'],
  ['GET', '/api/v1/vehicles/NOPE/catalog'],
  ['GET', '/api/v1/oem/search?number=34116860114'],
  ['GET', '/api/v1/oem/search?number=3411-686-0114'],
  ['GET', '/api/v1/oem/search?number=99999999999'],
];

const BODIES = [
  [{ sessionId: 'widget-demo-1', items: [{ oem: '34116860114', brand: 'BMW', name: 'Р”РёСЃРє С‚РѕСЂРјРѕР·РЅРѕР№ Р·Р°РґРЅРёР№', quantity: 2, price: 6240, vehicleId: 'VF-318I-2008' }] }],
  [{ sessionId: 'x', items: [] }],
  [{ items: [{ oem: '1' }] }],
  [{ sessionId: 'y', items: [{ oem: '13547552107', name: 'Р‘Р»РѕРє СѓРїСЂР°РІР»РµРЅРёСЏ РґРІРёРіР°С‚РµР»РµРј', quantity: 1, price: 32000 }] }],
];

/**
 * Two fields are expected to differ by design: `tookMs` is wall-clock, and the
 * serverless build has no Redis so `cacheEnabled` is false and `cache` is
 * always BYPASS. Everything else must match the Java backend byte for byte.
 */
const stripVolatile = (value) => JSON.parse(JSON.stringify(value)
  .replace(/"tookMs":\d+/g, '"tookMs":0')
  .replace(/"cache":"(HIT|MISS|BYPASS)"/g, '"cache":"X"')
  .replace(/"cacheEnabled":(true|false)/g, '"cacheEnabled":"X"'));

const normalize = (r) => {
  const headers = {};
  for (const [k, v] of Object.entries(r.headers || {})) {
    const key = k.toLowerCase();
    if (key === 'x-cache') headers[key] = 'X';
    else if (key !== 'content-type' && key !== 'content-length' && key !== 'vary') headers[key] = v;
  }
  return { status: r.status, headers, body: stripVolatile(r.body) };
};

(async () => {
  console.log('GET endpoints vs Java backend');
  for (const [method, path] of CASES) {
    const java = await getJson(path);
    const js = await call(method, path);
    const a = JSON.stringify(normalize(java));
    const b = JSON.stringify(normalize(js));
    check(path, a === b, `\n      java=${a.slice(0, 260)}\n      js  =${b.slice(0, 260)}`);
  }

  console.log('POST /api/v1/cart/add vs Java backend');
  for (const [body] of BODIES) {
    const java = await postJson('/api/v1/cart/add', body);
    const js = await call('POST', '/api/v1/cart/add', body);
    const a = JSON.stringify(normalize(java));
    const b = JSON.stringify(normalize(js));
    const label = `cart/add ${JSON.stringify(body).slice(0, 60)}`;
    check(label, a === b, `\n      java=${a.slice(0, 300)}\n      js  =${b.slice(0, 300)}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });

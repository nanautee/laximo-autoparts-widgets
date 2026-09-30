import fixture from './_fixture.json' with { type: 'json' };

const MOCK_NOTE = 'Демо-режим: встроенные фикстуры вместо платного API Laximo';
const ABCP_BASE_URL = 'https://api.abcp.ru';
const VIN_LENGTH = 17;

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  body: JSON.stringify(body),
});

const meta = (tookMs) => ({ source: 'mock', cache: 'BYPASS', tookMs, note: MOCK_NOTE });

const fail = (statusCode, code, message, hint, fields = null) =>
  json(statusCode, { code, message, hint, ...(fields ? { fields } : {}) });

const listResponse = (items, tookMs) =>
  json(200, { items, count: items.length, meta: meta(tookMs) }, { 'X-Cache': 'BYPASS', 'X-Source': 'mock' });

const normalizeVin = (raw) => {
  if (raw == null || String(raw).trim() === '') {
    throw { statusCode: 400, code: 'VIN_REQUIRED', message: 'VIN is required',
      hint: 'Enter the 17-character VIN from the registration certificate.' };
  }
  const vin = String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (vin.length !== VIN_LENGTH) {
    throw { statusCode: 400, code: 'VIN_LENGTH',
      message: `VIN must be exactly 17 characters, got ${vin.length}`,
      hint: 'The VIN is printed on the registration certificate and on the dashboard.' };
  }
  if (/[IOQ]/.test(vin)) {
    throw { statusCode: 400, code: 'VIN_ALPHABET', message: 'VIN must not contain I, O or Q',
      hint: 'Those letters are not part of the VIN alphabet.' };
  }
  return vin;
};

const decodeVehicle = (vin) => {
  const known = fixture.vinIndex[vin];
  const base = known
    ? fixture.vehicleList.find((v) => v.vehicleId === known)
    : fixture.vehicleList[Math.abs(javaHash(vin) % fixture.vehicleList.length)];
  const { vehicleId, ...rest } = base;
  return known ? base : { vehicleId, vin, ...rest };
};

/**
 * Part prices scale per vehicle: `base * factor / 100`, where the factor comes
 * from the vehicleId hash. The fixture ships one template (captured at factor
 * 100) and rescales it per request, which keeps the bundle at ~37 KB instead of
 * one full tree per vehicle.
 */
const javaHash = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
};

const priceFactor = (vehicleId) => 85 + (((javaHash(vehicleId ?? '') % 40) + 40) % 40);

const templateFactor = priceFactor(fixture.templateVehicleId);

const scaleNode = (node, factor) => {
  if (node.price != null) {
    return {
      ...node,
      price: Math.floor((node.price * factor) / templateFactor),
      stockCount: node.inStock ? 3 + (factor % 12) : 0,
    };
  }
  return node;
};

const catalogGroups = (vehicleId, groupId) => {
  const level = fixture.catalogTemplate[groupId ?? 'ROOT'];
  if (!level) return [];
  const factor = priceFactor(vehicleId);
  return level.map((node) => scaleNode(node, factor));
};

const rootGroups = (vehicleId) => catalogGroups(vehicleId, null);

const guessBrand = (normalized) => (/^[0-9]/.test(normalized) ? 'BMW' : 'OEM');

const genericOemResult = (oem) => {
  const normalized = String(oem).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const brand = guessBrand(normalized);
  const display = String(oem).toUpperCase();
  return {
    oem: display,
    brand,
    name: `Деталь по номеру ${display}`,
    category: 'Не определена',
    note: 'Номер не найден в демо-индексе, показана типовая выдача',
    crosses: [
      { oem: display, brand, name: `Деталь по номеру ${display}`, price: 1500, currency: 'RUB', inStock: true, original: true, supplier: 'Original' },
      { oem: `${normalized}A`, brand, name: `Аналог (замена) ${display}`, price: 980, currency: 'RUB', inStock: true, original: false, supplier: 'Noname' },
      { oem: `${normalized}B`, brand: 'TRW', name: `Аналог premium ${display}`, price: 1320, currency: 'RUB', inStock: true, original: false, supplier: 'TRW' },
    ],
    applicability: [
      { brand: 'Универсально', model: '—', modification: '—', yearRange: '—', note: 'Применимость уточняется по VIN' },
    ],
    minPrice: 980,
    currency: 'RUB',
  };
};

const searchOem = (raw) => {
  const key = String(raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return fixture.oemIndex[key] ?? genericOemResult(raw);
};

const resolveLines = (items) => items.map((item) => {
  const quantity = item.quantity ?? 1;
  const amount = (item.price ?? 0) * quantity;
  const line = { oem: item.oem };
  if (item.brand != null) line.brand = item.brand;
  if (item.name != null) line.name = item.name;
  line.quantity = quantity;
  if (item.price != null) line.price = item.price;
  line.amount = amount;
  line.inStock = true;
  line.supplier = '—';
  return line;
});

const buildAbcpPayload = (request) => ({
  sessionId: request.sessionId,
  clientType: 'WWW',
  items: request.items.map((i) => {
    const item = { oem: i.oem };
    if (i.brand != null) item.brand = i.brand;
    if (i.name != null) item.name = i.name;
    item.quantity = i.quantity ?? 1;
    if (i.price != null) item.price = i.price;
    if (i.vehicleId != null) item.reference = `laximo:${i.vehicleId}`;
    return item;
  }),
});

const addToCart = (body) => {
  const request = body ?? {};
  const issues = [];
  if (request.sessionId == null || String(request.sessionId).trim() === '') {
    issues.push({ field: 'sessionId', message: 'must not be blank' });
  }
  if (!Array.isArray(request.items) || request.items.length === 0) {
    issues.push({ field: 'items', message: 'must not be empty' });
  } else {
    request.items.forEach((item, index) => {
      if (item?.oem == null || String(item.oem).trim() === '') {
        issues.push({ field: `items[${index}].oem`, message: 'must not be blank' });
      }
      if (item?.quantity != null && item.quantity < 1) {
        issues.push({ field: `items[${index}].quantity`, message: 'must be greater than or equal to 1' });
      }
    });
  }
  if (issues.length > 0) {
    return fail(400, 'VALIDATION_FAILED', 'Request validation failed',
      'Check the highlighted fields and try again.', issues);
  }

  const lines = resolveLines(request.items);
  const itemsTotal = lines.length;
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  return json(200, {
    success: true,
    mode: 'simulated',
    sessionId: request.sessionId,
    itemsTotal,
    totalAmount,
    currency: 'RUB',
    lines,
    request: buildAbcpPayload(request),
    message: 'ABCP не сконфигурирован: показано сформированное тело запроса',
  });
};

const routes = [
  {
    method: 'GET',
    match: (p) => p === '/api/v1/meta',
    handle: () => json(200, {
      dataSource: 'mock',
      cartMode: 'simulated',
      cacheEnabled: false,
      cacheTtl: fixture.cacheTtl,
      testVins: fixture.testVins,
      testOemNumbers: fixture.testOemNumbers,
    }),
  },
  {
    method: 'GET',
    match: (p) => p === '/api/v1/cart/status',
    handle: () => json(200, { mode: 'simulated', baseUrl: ABCP_BASE_URL, live: false, dataSource: 'mock' }),
  },
  {
    method: 'POST',
    match: (p) => p === '/api/v1/cart/add',
    handle: (_p, { body }) => addToCart(body),
  },
  {
    method: 'GET',
    match: (p) => p === '/api/v1/catalog/brands',
    handle: (_p, { query }) => {
      const started = Date.now();
      const q = (query.get('q') ?? '').toLowerCase();
      const items = q === ''
        ? fixture.brands
        : fixture.brands.filter((b) => b.name.toLowerCase().includes(q));
      return listResponse(items, Date.now() - started);
    },
  },
  {
    method: 'GET',
    match: (p) => /^\/api\/v1\/catalog\/brands\/[^/]+\/models$/.test(p),
    handle: (p, { query }) => {
      const started = Date.now();
      const brandId = decodeURIComponent(p.split('/')[5]);
      return listResponse(fixture.models[brandId] ?? [], Date.now() - started);
    },
  },
  {
    method: 'GET',
    match: (p) => /^\/api\/v1\/catalog\/models\/[^/]+\/modifications$/.test(p),
    handle: (p, { query }) => {
      const started = Date.now();
      const modelId = decodeURIComponent(p.split('/')[5]);
      const known = fixture.modifications[modelId];
      const items = known && known.length > 0
        ? known
        : Object.values(fixture.modifications).flat().slice(0, 4);
      return listResponse(items, Date.now() - started);
    },
  },
  {
    method: 'GET',
    match: (p) => p === '/api/v1/vehicles/decode',
    handle: (_p, { query }) => {
      const started = Date.now();
      const vin = normalizeVin(query.get('vin'));
      const vehicle = decodeVehicle(vin);
      return json(200,
        { vehicle, groups: rootGroups(vehicle.vehicleId), meta: meta(Date.now() - started) },
        { 'X-Cache': 'BYPASS', 'X-Source': 'mock' });
    },
  },
  {
    method: 'GET',
    match: (p) => /^\/api\/v1\/vehicles\/[^/]+\/catalog$/.test(p),
    handle: (p, { query }) => {
      const started = Date.now();
      const vehicleId = decodeURIComponent(p.split('/')[4]);
      const groupId = query.get('groupId');
      const groups = catalogGroups(vehicleId, groupId);
      const body = groupId
        ? { vehicleId, groupId, groups, meta: meta(Date.now() - started) }
        : { vehicleId, groups, meta: meta(Date.now() - started) };
      return json(200, body, { 'X-Cache': 'BYPASS', 'X-Source': 'mock' });
    },
  },
  {
    method: 'GET',
    match: (p) => p === '/api/v1/oem/search',
    handle: (_p, { query }) => {
      const started = Date.now();
      const result = searchOem(query.get('number'));
      return json(200, { result, meta: meta(Date.now() - started) },
        { 'X-Cache': 'BYPASS', 'X-Source': 'mock' });
    },
  },
];

// Vercel rewrites deliver the real route in the `path` query parameter
// (catch-all gives an array, rewrite gives a string) while event.path collapses
// to the rewrite target, so the parameter is the only trustworthy source.
const resolvePath = (event, query) => {
  const param = event.queryStringParameters?.path ?? query.get('path');
  const suffix = String(Array.isArray(param) ? param.join('/') : (param || ''))
    .replace(/^\/+|\/+$/g, '');
  if (suffix) return `/api/${suffix}`;
  const eventPath = String(event.path || event.rawUrl || '').replace(/^\/+|\/+$/g, '');
  return eventPath ? `/api/${eventPath.replace(/^api\//, '')}` : '/api';
};

export const handler = async (event) => {
  const started = Date.now();
  const query = new URLSearchParams(event.rawQueryString || '');
  const cleanPath = resolvePath(event, query);

  if (cleanPath === '/api/v1/health') {
    return json(200, { status: 'UP', dataSource: 'mock', tookMs: Date.now() - started });
  }

  for (const route of routes) {
    if (route.method !== event.httpMethod) continue;
    if (!route.match(cleanPath)) continue;
    try {
      const body = event.body
        ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
        : null;
      return route.handle(cleanPath, { query, body: body ? JSON.parse(body) : null });
    } catch (error) {
      if (error && typeof error.statusCode === 'number') {
        return fail(error.statusCode, error.code, error.message, error.hint);
      }
      return fail(500, 'INTERNAL_ERROR', 'Unexpected server error',
        'The upstream integration failed. Please retry.');
    }
  }

  return fail(404, 'NOT_FOUND', `No handler for ${event.httpMethod} ${cleanPath}`, cleanPath);
};

export default handler;

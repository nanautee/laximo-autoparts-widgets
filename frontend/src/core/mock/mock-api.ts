import {
  ApiError,
  type AbcpItem,
  type AbcpPayload,
  type Brand,
  type CartLine,
  type CartResult,
  type CatalogNode,
  type CatalogResponse,
  type ListResponse,
  type MetaInfo,
  type Modification,
  type Model,
  type OemSearchResult,
  type OemSearchResponse,
  type ResponseMeta,
  type Vehicle,
  type VinDecodeResponse,
} from '../types';
import raw from '../../../lib/api/_fixture.json';

interface Fixture {
  cacheTtl: MetaInfo['cacheTtl'];
  testVins: MetaInfo['testVins'];
  testOemNumbers: MetaInfo['testOemNumbers'];
  brands: Brand[];
  models: Record<string, Model[]>;
  modifications: Record<string, Modification[]>;
  vehicleList: Vehicle[];
  vinIndex: Record<string, string>;
  catalogTemplate: Record<string, CatalogNode[]>;
  templateVehicleId: string;
  oemIndex: Record<string, OemSearchResult>;
}

const fixture = raw as unknown as Fixture;

const MOCK_NOTE = 'Демо-режим: встроенные фикстуры вместо платного API Laximo';
const ABCP_BASE_URL = 'https://api.abcp.ru';
const VIN_LENGTH = 17;

/** Stands in for network latency so the demo reads as a live backend. */
const think = (): Promise<void> =>
  new Promise((resolve) => { setTimeout(resolve, 90 + Math.random() * 170); });

const meta = (tookMs: number): ResponseMeta => ({ source: 'mock', cache: 'BYPASS', tookMs, note: MOCK_NOTE });

const listResponse = <T>(items: T[], tookMs: number): ListResponse<T> => ({
  items,
  count: items.length,
  meta: meta(tookMs),
});

/** Mirrors the Java `String.hashCode`, so mock prices match the backend's. */
const javaHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
};

/**
 * Part prices scale per vehicle: `base * factor / templateFactor`. One template
 * is shipped and rescaled per request, which keeps the payload small while
 * still giving every vehicle its own price range.
 */
const priceFactor = (vehicleId: string | null | undefined): number =>
  85 + (((javaHash(vehicleId ?? '') % 40) + 40) % 40);

const templateFactor = priceFactor(fixture.templateVehicleId);

const scaleNode = (node: CatalogNode, factor: number): CatalogNode => {
  if (node.price != null) {
    return {
      ...node,
      price: Math.floor((node.price * factor) / templateFactor),
      stockCount: node.inStock ? 3 + (factor % 12) : 0,
    };
  }
  return node;
};

const catalogGroups = (vehicleId: string, groupId?: string | null): CatalogNode[] => {
  const level = fixture.catalogTemplate[groupId ?? 'ROOT'];
  if (!level) return [];
  const factor = priceFactor(vehicleId);
  return level.map((node) => scaleNode(node, factor));
};

const normalizeVin = (value: string | null | undefined): string => {
  if (value == null || String(value).trim() === '') {
    throw new ApiError(400, 'VIN_REQUIRED', 'VIN обязателен',
      'Введите 17-значный VIN из свидетельства о регистрации.');
  }
  const vin = String(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (vin.length !== VIN_LENGTH) {
    throw new ApiError(400, 'VIN_LENGTH', `VIN должен содержать ровно 17 символов, получено ${vin.length}`,
      'VIN указан в свидетельстве о регистрации и на подрамнике автомобиля.');
  }
  if (/[IOQ]/.test(vin)) {
    throw new ApiError(400, 'VIN_ALPHABET', 'VIN не должен содержать буквы I, O или Q',
      'Эти буквы не входят в алфавит VIN.');
  }
  return vin;
};

const decodeVehicle = (vin: string): Vehicle => {
  const known = fixture.vinIndex[vin];
  const base = known
    ? fixture.vehicleList.find((v) => v.vehicleId === known)
    : fixture.vehicleList[Math.abs(javaHash(vin) % fixture.vehicleList.length)];
  if (!base) {
    throw new ApiError(404, 'VEHICLE_NOT_FOUND', 'Автомобиль не найден',
      'Попробуйте другой VIN или подберите автомобиль через каталог.');
  }
  // An unknown but well-formed VIN still decodes, and echoes the input VIN back.
  return known ? base : { ...base, vin };
};

const guessBrand = (normalized: string): string => (/^[0-9]/.test(normalized) ? 'BMW' : 'OEM');

/** Unknown numbers still yield a plausible result, as the real gateway would. */
const genericOemResult = (oem: string): OemSearchResult => {
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

interface CartRequestItem {
  oem: string;
  brand?: string;
  name?: string;
  quantity: number;
  price?: number;
  vehicleId?: string;
}

interface CartRequest {
  sessionId: string;
  items: CartRequestItem[];
}

const resolveLines = (items: CartRequestItem[]): CartLine[] =>
  items.map((item) => {
    const quantity = item.quantity ?? 1;
    const line: CartLine = { oem: item.oem, quantity, amount: (item.price ?? 0) * quantity, inStock: true, supplier: '—' };
    if (item.brand != null) line.brand = item.brand;
    if (item.name != null) line.name = item.name;
    if (item.price != null) line.price = item.price;
    return line;
  });

const buildAbcpPayload = (request: CartRequest): AbcpPayload => ({
  sessionId: request.sessionId,
  clientType: 'WWW',
  items: request.items.map((i): AbcpItem => {
    const item: AbcpItem = { oem: i.oem, quantity: i.quantity ?? 1 };
    if (i.brand != null) item.brand = i.brand;
    if (i.name != null) item.name = i.name;
    if (i.price != null) item.price = i.price;
    if (i.vehicleId != null) item.reference = `laximo:${i.vehicleId}`;
    return item;
  }),
});

const addToCart = (body: CartRequest): CartResult => {
  const request = body ?? { sessionId: '', items: [] };
  const fields: { field: string; message: string }[] = [];
  if (request.sessionId == null || String(request.sessionId).trim() === '') {
    fields.push({ field: 'sessionId', message: 'must not be blank' });
  }
  if (!Array.isArray(request.items) || request.items.length === 0) {
    fields.push({ field: 'items', message: 'must not be empty' });
  } else {
    request.items.forEach((item, index) => {
      if (item?.oem == null || String(item.oem).trim() === '') {
        fields.push({ field: `items[${index}].oem`, message: 'must not be blank' });
      }
      if (item?.quantity != null && item.quantity < 1) {
        fields.push({ field: `items[${index}].quantity`, message: 'must be greater than or equal to 1' });
      }
    });
  }
  if (fields.length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Проверка запроса не пройдена',
      'Проверьте обязательные поля и повторите попытку.');
  }

  const lines = resolveLines(request.items);
  return {
    success: true,
    mode: 'simulated',
    sessionId: request.sessionId,
    itemsTotal: lines.length,
    totalAmount: lines.reduce((sum, l) => sum + (l.amount ?? 0), 0),
    currency: 'RUB',
    lines,
    request: buildAbcpPayload(request),
    message: 'ABCP не сконфигурирован: показано сформированное тело запроса',
  };
};

/**
 * Offline twin of the backend, contract-identical to `lib/api/handler.mjs`.
 *
 * It answers the same paths with the same payload shape so the widgets can be
 * demonstrated on a static host, in a review sandbox, or anywhere the API is
 * unreachable, without the UI degrading into an error state.
 */
export const mockApi = {
  async meta(): Promise<MetaInfo> {
    await think();
    return {
      dataSource: 'mock',
      cartMode: 'simulated',
      cacheEnabled: false,
      cacheTtl: fixture.cacheTtl,
      testVins: fixture.testVins,
      testOemNumbers: fixture.testOemNumbers,
    };
  },

  async decodeVin(vin: string): Promise<VinDecodeResponse> {
    const started = Date.now();
    const normalized = normalizeVin(vin);
    const vehicle = decodeVehicle(normalized);
    await think();
    return {
      vehicle,
      groups: catalogGroups(vehicle.vehicleId, null),
      meta: meta(Date.now() - started),
    };
  },

  async catalog(vehicleId: string, groupId?: string): Promise<CatalogResponse> {
    const started = Date.now();
    const groups = catalogGroups(vehicleId, groupId ?? null);
    await think();
    return {
      vehicleId,
      groupId: groupId ?? null,
      groups,
      meta: meta(Date.now() - started),
    };
  },

  async brands(query?: string): Promise<ListResponse<Brand>> {
    const started = Date.now();
    const q = (query ?? '').toLowerCase();
    const items = q === '' ? fixture.brands : fixture.brands.filter((b) => b.name.toLowerCase().includes(q));
    await think();
    return listResponse(items, Date.now() - started);
  },

  async models(brandId: string): Promise<ListResponse<Model>> {
    const started = Date.now();
    const items = fixture.models[brandId] ?? [];
    await think();
    return listResponse(items, Date.now() - started);
  },

  async modifications(modelId: string): Promise<ListResponse<Modification>> {
    const started = Date.now();
    const known = fixture.modifications[modelId];
    const items = known && known.length > 0
      ? known
      : Object.values(fixture.modifications).flat().slice(0, 4);
    await think();
    return listResponse(items, Date.now() - started);
  },

  async searchOem(number: string): Promise<OemSearchResponse> {
    const started = Date.now();
    const key = String(number ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const result = fixture.oemIndex[key] ?? genericOemResult(number);
    await think();
    return { result, meta: meta(Date.now() - started) };
  },

  async addToCart(body: CartRequest): Promise<CartResult> {
    await think();
    return addToCart(body);
  },
};

export { ABCP_BASE_URL };

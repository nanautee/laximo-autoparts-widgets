/**
 * Shared types mirroring the backend DTOs (`com.autoparts.hub.dto`).
 * Keeping them in one file makes the API contract easy to review.
 */

export interface ResponseMeta {
  source: 'laximo' | 'mock' | 'abcp';
  cache: 'HIT' | 'MISS' | 'BYPASS';
  tookMs: number;
  note?: string | null;
}

export interface Vehicle {
  vehicleId: string;
  vin?: string | null;
  brand: string;
  model: string;
  modification: string;
  year?: number | null;
  engine?: string | null;
  fuel?: string | null;
  gearbox?: string | null;
  drive?: string | null;
  body?: string | null;
  power?: string | null;
  country?: string | null;
  market?: string | null;
  imageUrl?: string | null;
  oemPlatforms?: string[];
}

export type CatalogNodeKind = 'GROUP' | 'PART';

export interface CatalogNode {
  id: string;
  kind: CatalogNodeKind;
  name: string;
  nameRu?: string | null;
  oem?: string | null;
  brand?: string | null;
  ean?: string | null;
  price?: number | null;
  currency?: string | null;
  inStock?: boolean | null;
  stockCount?: number | null;
  imageUrl?: string | null;
  note?: string | null;
  children: CatalogNode[];
}

export interface Brand {
  id: string;
  name: string;
  country?: string | null;
}

export interface Model {
  id: string;
  brandId: string;
  name: string;
  years: number[];
  modificationCount?: number | null;
}

export interface Modification {
  id: string;
  modelId: string;
  name: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  engine?: string | null;
  fuel?: string | null;
  gearbox?: string | null;
  drive?: string | null;
  body?: string | null;
  power?: string | null;
  platformId?: string | null;
}

export interface CrossPart {
  oem: string;
  brand: string;
  name: string;
  price?: number | null;
  currency?: string | null;
  inStock?: boolean | null;
  original?: boolean | null;
  supplier?: string | null;
}

export interface Applicability {
  brand: string;
  model: string;
  modification?: string | null;
  yearRange?: string | null;
  note?: string | null;
}

export interface OemSearchResult {
  oem: string;
  brand?: string | null;
  name?: string | null;
  ean?: string | null;
  category?: string | null;
  note?: string | null;
  crosses: CrossPart[];
  applicability: Applicability[];
  minPrice?: number | null;
  currency?: string | null;
}

export interface CartLine {
  oem: string;
  brand?: string | null;
  name?: string | null;
  quantity: number;
  price?: number | null;
  amount?: number | null;
  inStock?: boolean | null;
  supplier?: string | null;
}

export interface AbcpItem {
  oem: string;
  brand?: string | null;
  name?: string | null;
  quantity: number;
  price?: number | null;
  reference?: string | null;
}

export interface AbcpPayload {
  sessionId: string;
  clientType: string;
  items: AbcpItem[];
}

export interface CartResult {
  success: boolean;
  mode: 'abcp' | 'simulated';
  sessionId: string;
  itemsTotal?: number | null;
  totalAmount?: number | null;
  currency?: string | null;
  lines: CartLine[];
  request: AbcpPayload;
  message?: string | null;
}

export interface VinDecodeResponse {
  vehicle: Vehicle;
  groups: CatalogNode[];
  meta: ResponseMeta;
}

export interface CatalogResponse {
  vehicleId: string;
  groupId: string | null;
  groups: CatalogNode[];
  meta: ResponseMeta;
}

export interface ListResponse<T> {
  items: T[];
  count: number;
  meta: ResponseMeta;
}

export interface OemSearchResponse {
  result: OemSearchResult;
  meta: ResponseMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  hint?: string | null;
  fields?: { field: string; message: string }[] | null;
}

export interface MetaInfo {
  dataSource: 'laximo' | 'mock';
  cartMode: 'abcp' | 'simulated';
  cacheEnabled: boolean;
  cacheTtl: { namespace: string; ttl: string }[];
  testVins: { vin: string; vehicle: string }[];
  testOemNumbers: { number: string; part: string }[];
}

/** Thrown by the API client for any non-2xx response. */
export class ApiError extends Error {
  readonly code: string;
  readonly hint: string | null;
  readonly status: number;

  constructor(status: number, code: string, message: string, hint?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hint = hint ?? null;
  }
}

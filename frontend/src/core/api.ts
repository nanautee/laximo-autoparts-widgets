import {
  ApiError,
  type Brand,
  type CatalogNode,
  type CatalogResponse,
  type ListResponse,
  type MetaInfo,
  type Modification,
  type Model,
  type OemSearchResponse,
  type VinDecodeResponse,
  type CartResult,
} from './types';

/**
 * Backend base URL.
 *
 * Resolved in this order:
 *  1. `window.__AUTOPARTS_CONFIG__.apiBase` - runtime override, which is how a
 *     shop page points the widget at its own backend without a rebuild.
 *  2. `import.meta.env.VITE_API_BASE` - build-time value (used by the demo).
 *  3. same origin - works when the backend serves the widgets itself.
 */
function resolveBaseUrl(): string {
  const runtime = (window as unknown as { __AUTOPARTS_CONFIG__?: { apiBase?: string } })
    .__AUTOPARTS_CONFIG__?.apiBase;
  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  const base = runtime || fromEnv || '';
  return base.replace(/\/+$/, '');
}

/**
 * Resolved lazily on every call: a host page may set
 * `__AUTOPARTS_CONFIG__.apiBase` (or pass `apiBase` to a mount call) after this
 * module has already been evaluated, so a value captured at import time would
 * be stale.
 */
export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}

/** Cart session id, stable per browser tab. ABCP keys the basket by session. */
function resolveSessionId(): string {
  const key = 'autoparts.sessionId';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const generated = `wp-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    // Private mode / storage disabled: fall back to an in-memory session.
    return `wp-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const SESSION_ID = resolveSessionId();

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * How long a single request may take before the demo data answers instead.
 *
 * Without a ceiling the widgets sit on a spinner until the edge gives up, which
 * reads as a broken widget rather than an unreachable API.
 */
function resolveTimeout(): number {
  const runtime = (window as unknown as { __AUTOPARTS_CONFIG__?: { timeout?: number } })
    .__AUTOPARTS_CONFIG__?.timeout;
  const fromEnv = Number(import.meta.env.VITE_API_TIMEOUT as string | undefined);
  const value = runtime ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : undefined);
  return value ?? 4000;
}

/**
 * Demo data policy.
 *
 *  - `auto` (default) - call the API, fall back to bundled fixtures when it is
 *    unreachable. Keeps the widgets demonstrable on a static host.
 *  - `always` - never touch the network, answer from fixtures.
 *  - `off` - no fallback; surface the real error.
 */
function resolveMockMode(): 'auto' | 'always' | 'off' {
  const runtime = (window as unknown as { __AUTOPARTS_CONFIG__?: { mock?: string } })
    .__AUTOPARTS_CONFIG__?.mock;
  const fromEnv = (import.meta.env.VITE_MOCK_API as string | undefined) ?? 'auto';
  const value = runtime ?? fromEnv;
  return value === 'always' || value === 'off' ? value : 'auto';
}

export function getMockMode(): 'auto' | 'always' | 'off' {
  return resolveMockMode();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  let timedOut = false;

  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, resolveTimeout());

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (cause) {
      // A caller-driven abort means the visitor moved on, not that the API is down.
      if (!timedOut && options.signal?.aborted) throw cause;
      throw new ApiError(
        0,
        timedOut ? 'TIMEOUT' : 'NETWORK',
        timedOut ? 'Backend не ответил вовремя' : 'Backend недоступен',
        timedOut
          ? 'Ответ не пришёл за отведённое время, показаны демо-данные.'
          : 'Проверьте адрес API и доступность сервиса.',
      );
    }

    if (!response.ok) {
      let code = `HTTP_${response.status}`;
      let message = `Запрос завершился с кодом ${response.status}`;
      let hint: string | null = null;
      try {
        const body = await response.json();
        code = body.code ?? code;
        message = body.message ?? message;
        hint = body.hint ?? null;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, code, message, hint);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

/**
 * Statuses that mean "there is no usable API behind this URL" rather than a
 * meaningful answer. A 400 stays a 400: the demo data must not paper over a
 * validation error the visitor actually caused.
 */
const UNAVAILABLE_STATUSES = new Set([0, 404, 405, 408, 425, 429, 500, 502, 503, 504, 520, 522, 524]);

function isUnavailable(error: unknown): boolean {
  if ((error as Error)?.name === 'AbortError') return false;
  if (error instanceof ApiError) return UNAVAILABLE_STATUSES.has(error.status);
  // Malformed body, proxy HTML served with 200, and friends.
  return true;
}

type MockApi = typeof import('./mock/mock-api')['mockApi'];

let mockApiPromise: Promise<MockApi> | null = null;

/** Imported on demand so the fixtures stay out of the widget bundle. */
function loadMockApi(): Promise<MockApi> {
  if (!mockApiPromise) {
    mockApiPromise = import('./mock/mock-api').then((module) => module.mockApi);
  }
  return mockApiPromise;
}

async function call<T>(path: string, options: RequestOptions, mock: (api: MockApi) => Promise<T>): Promise<T> {
  if (resolveMockMode() === 'always') return mock(await loadMockApi());
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (resolveMockMode() === 'off' || !isUnavailable(error)) throw error;
    return mock(await loadMockApi());
  }
}

/**
 * Thin, typed facade over the widget API. The widgets never touch `fetch`
 * directly, so swapping transports or adding retries is a single-file change.
 */
export const api = {
  decodeVin: (vin: string, signal?: AbortSignal) =>
    call<VinDecodeResponse>(
      `/api/v1/vehicles/decode?vin=${encodeURIComponent(vin)}`,
      { signal },
      (m) => m.decodeVin(vin),
    ),

  catalog: (vehicleId: string, groupId?: string, signal?: AbortSignal) => {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return call<CatalogResponse>(
      `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/catalog${query}`,
      { signal },
      (m) => m.catalog(vehicleId, groupId),
    );
  },

  brands: (query?: string, signal?: AbortSignal) =>
    call<ListResponse<Brand>>(
      `/api/v1/catalog/brands${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      { signal },
      (m) => m.brands(query),
    ),

  models: (brandId: string, signal?: AbortSignal) =>
    call<ListResponse<Model>>(`/api/v1/catalog/brands/${encodeURIComponent(brandId)}/models`, { signal }, (m) => m.models(brandId)),

  modifications: (modelId: string, signal?: AbortSignal) =>
    call<ListResponse<Modification>>(
      `/api/v1/catalog/models/${encodeURIComponent(modelId)}/modifications`,
      { signal },
      (m) => m.modifications(modelId),
    ),

  searchOem: (number: string, signal?: AbortSignal) =>
    call<OemSearchResponse>(`/api/v1/oem/search?number=${encodeURIComponent(number)}`, { signal }, (m) => m.searchOem(number)),

  addToCart: (items: { oem: string; brand?: string; name?: string; quantity: number; price?: number; vehicleId?: string }[]) =>
    call<CartResult>(
      '/api/v1/cart/add',
      { method: 'POST', body: { sessionId: SESSION_ID, items } },
      (m) => m.addToCart({ sessionId: SESSION_ID, items }),
    ),

  meta: (signal?: AbortSignal) =>
    call<MetaInfo>('/api/v1/meta', { signal }, (m) => m.meta()),
};

export type { Brand, CatalogNode, Modification, Model };

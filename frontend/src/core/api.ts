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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    if ((cause as Error)?.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK', 'Backend недоступен',
      'Проверьте адрес API и доступность сервиса.');
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
}

/**
 * Thin, typed facade over the widget API. The widgets never touch `fetch`
 * directly, so swapping transports or adding retries is a single-file change.
 */
export const api = {
  decodeVin: (vin: string, signal?: AbortSignal) =>
    request<VinDecodeResponse>(`/api/v1/vehicles/decode?vin=${encodeURIComponent(vin)}`, { signal }),

  catalog: (vehicleId: string, groupId?: string, signal?: AbortSignal) => {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<CatalogResponse>(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}/catalog${query}`, {
      signal,
    });
  },

  brands: (query?: string, signal?: AbortSignal) =>
    request<ListResponse<Brand>>(`/api/v1/catalog/brands${query ? `?q=${encodeURIComponent(query)}` : ''}`, {
      signal,
    }),

  models: (brandId: string, signal?: AbortSignal) =>
    request<ListResponse<Model>>(`/api/v1/catalog/brands/${encodeURIComponent(brandId)}/models`, { signal }),

  modifications: (modelId: string, signal?: AbortSignal) =>
    request<ListResponse<Modification>>(
      `/api/v1/catalog/models/${encodeURIComponent(modelId)}/modifications`,
      { signal },
    ),

  searchOem: (number: string, signal?: AbortSignal) =>
    request<OemSearchResponse>(`/api/v1/oem/search?number=${encodeURIComponent(number)}`, { signal }),

  addToCart: (items: { oem: string; brand?: string; name?: string; quantity: number; price?: number; vehicleId?: string }[]) =>
    request<CartResult>('/api/v1/cart/add', {
      method: 'POST',
      body: { sessionId: SESSION_ID, items },
    }),

  meta: (signal?: AbortSignal) => request<MetaInfo>('/api/v1/meta', { signal }),
};

export type { Brand, CatalogNode, Modification, Model };

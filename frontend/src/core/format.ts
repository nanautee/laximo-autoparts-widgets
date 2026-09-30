/** Formatting helpers shared by the widgets. */

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const numFormatter = new Intl.NumberFormat('ru-RU');

export function formatPrice(value?: number | null, currency = 'RUB'): string {
  if (value === null || value === undefined) return '—';
  if (currency === 'RUB') return rubFormatter.format(value).replace(/\u00a0/g, ' ');
  return `${numFormatter.format(value)} ${currency}`;
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  return numFormatter.format(value);
}

export function formatStock(count?: number | null, inStock?: boolean | null): string {
  if (inStock === false) return 'Нет в наличии';
  if (count) return `В наличии: ${count} шт.`;
  if (inStock === true) return 'В наличии';
  return 'По запросу';
}

/** `2005-2008` from two optional years, otherwise an empty string. */
export function formatYearRange(from?: number | null, to?: number | null): string {
  if (!from && !to) return '';
  if (from && to && from !== to) return `${from}–${to}`;
  return String(from ?? to ?? '');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Optional chaining that also treats an empty string as "not set". */
export function firstDefined(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined && value.trim() !== '') return value;
  }
  return undefined;
}

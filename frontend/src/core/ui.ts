import { icons } from './icons';
import { escapeHtml } from './format';
import type { ResponseMeta } from './types';

/** Small presentational helpers shared by the three widgets. */

export function card(options: {
  title: string;
  subtitle: string;
  icon: string;
  body: string;
  extraHead?: string;
}): string {
  return `
    <section class="ap-card">
      <header class="ap-card__head">
        <div class="ap-card__icon">${options.icon}</div>
        <div class="ap-card__titles">
          <h2 class="ap-card__title">${escapeHtml(options.title)}</h2>
          <p class="ap-card__subtitle">${options.subtitle}</p>
        </div>
        ${options.extraHead ?? ''}
      </header>
      <div class="ap-card__body">${options.body}</div>
    </section>
  `;
}

export function loadingState(label = 'Загрузка данных…'): string {
  return `
    <div class="ap-state" role="status" aria-live="polite">
      <div class="ap-state__icon"><span class="ap-spinner"></span></div>
      <p class="ap-state__title">${escapeHtml(label)}</p>
      <p class="ap-state__hint">Данные кэшируются в Redis, повторные запросы не тарифицируются.</p>
    </div>
  `;
}

export function skeletonList(rows = 4): string {
  return `
    <div class="ap-tree">
      ${Array.from({ length: rows })
        .map(
          () => `
        <div class="ap-skeleton" style="height:62px"></div>`,
        )
        .join('')}
    </div>
  `;
}

export function errorState(title: string, hint?: string | null): string {
  return `
    <div class="ap-state ap-state--error" role="alert">
      <div class="ap-state__icon">${icons.alert(20)}</div>
      <p class="ap-state__title">${escapeHtml(title)}</p>
      ${hint ? `<p class="ap-state__hint">${escapeHtml(hint)}</p>` : ''}
    </div>
  `;
}

export function emptyState(title: string, hint?: string): string {
  return `
    <div class="ap-state">
      <div class="ap-state__icon">${icons.search(20)}</div>
      <p class="ap-state__title">${escapeHtml(title)}</p>
      ${hint ? `<p class="ap-state__hint">${escapeHtml(hint)}</p>` : ''}
    </div>
  `;
}

export function metaStrip(meta: ResponseMeta): string {
  const cacheClass = meta.cache === 'HIT' ? 'ap-meta__dot--hit' : meta.cache === 'MISS' ? 'ap-meta__dot--miss' : '';
  const cacheLabel =
    meta.cache === 'HIT'
      ? 'Redis HIT'
      : meta.cache === 'MISS'
        ? 'Redis MISS → Laximo'
        : 'кэш отключён';
  const sourceLabel = meta.source === 'mock' ? 'демо-фикстуры' : meta.source;
  return `
    <div class="ap-meta">
      <span class="ap-meta__badge"><span class="ap-meta__dot ${cacheClass}"></span>${cacheLabel}</span>
      <span class="ap-meta__badge">источник: ${escapeHtml(sourceLabel)}</span>
      <span class="ap-meta__badge">${meta.tookMs} ms</span>
      ${meta.note ? `<span class="ap-meta__note">${escapeHtml(meta.note)}</span>` : ''}
    </div>
  `;
}

/** Escapes text for use inside an HTML attribute. */
export function attr(value: string): string {
  return escapeHtml(value).replace(/\n/g, ' ');
}

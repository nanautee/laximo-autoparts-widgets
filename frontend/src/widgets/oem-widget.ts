import { api } from '../core/api';
import { addToCartAndShow } from '../core/cart-modal';
import { escapeHtml, formatPrice, formatStock } from '../core/format';
import { icons } from '../core/icons';
import { card, emptyState, errorState, metaStrip, skeletonList } from '../core/ui';
import { ApiError, type MetaInfo, type OemSearchResult } from '../core/types';

export interface OemWidgetOptions {
  container: HTMLElement;
  initialNumber?: string;
  meta?: MetaInfo | null;
}

/**
 * Widget 3 - OEM number search.
 *
 * Given an original equipment number it shows cross numbers / analogues with
 * price and stock, plus the vehicles the part applies to. Every analogue can go
 * straight into the ABCP cart.
 */
export function mountOemWidget(options: OemWidgetOptions): () => void {
  const { container } = options;
  let abort: AbortController | null = null;
  let meta: MetaInfo | null = options.meta ?? null;

  const examples = () => {
    const items = meta?.testOemNumbers ?? [];
    if (!items.length) return '';
    return `
      <div class="ap-w-vin__examples" style="margin-top:12px">
        <span class="ap-w-vin__examples-label">Примеры номеров:</span>
        ${items
          .map(
            (item) =>
              `<button type="button" class="ap-w-vin__example" data-oem="${escapeHtml(item.number)}"
                 title="${escapeHtml(item.part)}">${escapeHtml(item.number)}</button>`,
          )
          .join('')}
      </div>
    `;
  };

  const searchForm = (value = '') => `
    <form class="ap-w-oem__search" autocomplete="off">
      <div style="flex:1 1 240px;min-width:0">
        <label class="ap-label" for="ap-oem-input">OEM / оригинальльный номер</label>
        <input id="ap-oem-input" class="ap-input ap-input--mono" name="number" maxlength="32"
               placeholder="34116860114" value="${escapeHtml(value)}" spellcheck="false" />
      </div>
      <button type="submit" class="ap-btn ap-btn--primary" style="align-self:flex-end">
        ${icons.search(16)} Найти аналоги
      </button>
    </form>
    ${examples()}
  `;

  const header = (result: OemSearchResult) => `
    <div class="ap-oem__primary">
      <p class="ap-oem__title">${escapeHtml(result.name ?? 'Деталь не определена')}</p>
      <div class="ap-oem__number">${escapeHtml(result.oem)}</div>
      <div class="ap-node__meta" style="margin-top:10px">
        ${result.brand ? `<span class="ap-chip ap-chip--primary">${escapeHtml(result.brand)}</span>` : ''}
        ${result.category ? `<span class="ap-chip">${escapeHtml(result.category)}</span>` : ''}
        ${result.ean ? `<span class="ap-chip ap-chip--mono">EAN ${escapeHtml(result.ean)}</span>` : ''}
      </div>
      ${result.note ? `<p class="ap-state__hint" style="margin-top:10px;text-align:left">${escapeHtml(result.note)}</p>` : ''}
      <div class="ap-oem__stats">
        <div class="ap-oem__stat">
          <div class="ap-oem__stat-label">Аналогов</div>
          <div class="ap-oem__stat-value">${result.crosses.length}</div>
        </div>
        <div class="ap-oem__stat">
          <div class="ap-oem__stat-label">Мин. цена</div>
          <div class="ap-oem__stat-value">${formatPrice(result.minPrice, result.currency ?? 'RUB')}</div>
        </div>
        <div class="ap-oem__stat">
          <div class="ap-oem__stat-label">Применимость</div>
          <div class="ap-oem__stat-value">${result.applicability.length}</div>
        </div>
      </div>
    </div>
  `;

  const crossRow = (item: OemSearchResult['crosses'][number]) => `
    <div class="ap-part${item.original ? ' ap-part--original' : ''}">
      <div class="ap-part__body">
        <div class="ap-part__name">${escapeHtml(item.name)}</div>
        <div class="ap-part__meta">
          <span class="ap-chip ap-chip--mono ap-chip--primary">${escapeHtml(item.oem)}</span>
          <span class="ap-chip">${escapeHtml(item.brand)}</span>
          ${item.original ? '<span class="ap-chip ap-chip--success">Оригинал</span>' : ''}
          ${item.supplier ? `<span class="ap-chip">${escapeHtml(item.supplier)}</span>` : ''}
          <span class="ap-chip ${item.inStock === false ? 'ap-chip--danger' : 'ap-chip--success'}">
            ${formatStock(null, item.inStock)}
          </span>
        </div>
      </div>
      <div class="ap-part__side">
        <div class="ap-part__price">
          <div class="ap-part__price-value">${formatPrice(item.price, item.currency ?? 'RUB')}</div>
          <div class="ap-part__price-note">${escapeHtml(item.brand)}</div>
        </div>
        <button type="button" class="ap-btn ap-btn--primary ap-btn--cart"
                data-add-oem="${escapeHtml(item.oem)}"
                data-add-name="${escapeHtml(item.name)}"
                data-add-brand="${escapeHtml(item.brand)}"
                data-add-price="${item.price ?? ''}">
          ${icons.cart(15)} В корзину
        </button>
      </div>
    </div>
  `;

  const applicability = (result: OemSearchResult) => `
    <p class="ap-section-title">Применимость</p>
    <div class="ap-fit">
      ${
        result.applicability.length
          ? result.applicability
              .map(
                (item) => `
          <div class="ap-fit__item">
            <span class="ap-fit__dot"></span>
            <div>
              <span class="ap-fit__brand">${escapeHtml(item.brand)}</span>
              <span class="ap-fit__model"> ${escapeHtml(item.model)}</span>
              ${item.modification ? `<div class="ap-fit__note">${escapeHtml(item.modification)}</div>` : ''}
              <div class="ap-fit__note">
                ${item.yearRange ? `Годы: ${escapeHtml(item.yearRange)}` : ''}
                ${item.note ? ` · ${escapeHtml(item.note)}` : ''}
              </div>
            </div>
          </div>`,
              )
              .join('')
          : '<p class="ap-state__hint">Применимость не указана. Уточните по VIN.</p>'
      }
    </div>
  `;

  const resultView = (result: OemSearchResult) => `
    ${header(result)}
    <p class="ap-section-title">Кросс-номера и аналоги</p>
    <div class="ap-parts">${result.crosses.map(crossRow).join('')}</div>
    ${applicability(result)}
  `;

  const shell = (body: string) =>
    card({
      title: 'Поиск по OEM-номеру',
      subtitle: 'Кросс-номера, аналоги с ценами и наличием, применимость к автомобилям.',
      icon: icons.oem(20),
      body,
    });

  const renderForm = (value = options.initialNumber ?? '') => shell(searchForm(value));

  async function search(rawNumber: string): Promise<void> {
    const number = rawNumber.trim();
    abort?.abort();
    abort = new AbortController();
    if (!number) {
      renderForm(number);
      return;
    }
    shell(`${searchForm(number)}<div style="margin-top:20px">${skeletonList(3)}</div>`);
    try {
      const response = await api.searchOem(number, abort.signal);
      if (!response.result.crosses.length) {
        shell(`${searchForm(number)}${emptyState('Кросс-номера не найдены', 'Проверьте номер или уточните по VIN.')}`);
        return;
      }
      shell(`${searchForm(number)}<div style="margin-top:20px">${resultView(response.result)}</div>${metaStrip(response.meta)}`);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      const text = error instanceof ApiError ? error.message : 'Внутренняя ошибка';
      const hint = error instanceof ApiError ? error.hint : 'Попробуйте повторить запрос.';
      shell(`${searchForm(number)}${errorState(text, hint)}`);
    }
  }

  const onSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('[name="number"]');
    void search(input?.value ?? '');
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;

    const example = target.closest<HTMLElement>('[data-oem]');
    if (example) {
      void search(example.dataset.oem as string);
      return;
    }

    const addButton = target.closest<HTMLElement>('[data-add-oem]');
    if (addButton) {
      const price = Number(addButton.dataset.addPrice || '0');
      void addToCartAndShow({
        oem: addButton.dataset.addOem as string,
        name: addButton.dataset.addName ?? '',
        brand: addButton.dataset.addBrand || null,
        price: Number.isFinite(price) && price > 0 ? price : undefined,
      });
    }
  };

  container.addEventListener('submit', onSubmit);
  container.addEventListener('click', onClick);

  void (async () => {
    if (!meta) {
      try {
        meta = await api.meta();
      } catch {
        meta = null;
      }
    }
    if (options.initialNumber) void search(options.initialNumber);
    else renderForm();
  })();

  return () => {
    abort?.abort();
    container.removeEventListener('submit', onSubmit);
    container.removeEventListener('click', onClick);
  };
}

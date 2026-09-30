import { api } from '../core/api';
import { addToCartAndShow } from '../core/cart-modal';
import { escapeHtml, formatNumber, formatYearRange } from '../core/format';
import { icons } from '../core/icons';
import { PartsTree } from '../core/parts-tree';
import { card, emptyState, errorState, metaStrip, skeletonList } from '../core/ui';
import { ApiError, type Brand, type MetaInfo, type Modification, type Model, type ResponseMeta } from '../core/types';

export interface CatalogWidgetOptions {
  container: HTMLElement;
  meta?: MetaInfo | null;
}

interface Selection {
  brand: Brand | null;
  model: Model | null;
  modification: Modification | null;
}

const STEP_LABELS = ['Марка', 'Модель', 'Год / модификация', 'Запчасти'];

/**
 * Widget 2 - catalog navigation.
 *
 * Brand -> model -> year/variant, then the same lazily loaded parts tree as the
 * VIN widget. The right rail keeps the already picked levels visible so the
 * visitor can go back without restarting.
 */
export function mountCatalogWidget(options: CatalogWidgetOptions): () => void {
  const { container } = options;
  let abort: AbortController | null = null;
  let tree: PartsTree | null = null;
  const selection: Selection = { brand: null, model: null, modification: null };

  let brands: Brand[] = [];
  let models: Model[] = [];
  let modifications: Modification[] = [];
  let lastMeta: ResponseMeta | null = null;

  const steps = (active: number) => {
    const values = [selection.brand?.name, selection.model?.name, selection.modification?.name, null];
    return `
      <div class="ap-w-catalog__steps">
        ${STEP_LABELS.map((label, index) => {
          const value = values[index];
          const state = value ? 'done' : index === active ? 'active' : '';
          return `
            ${
              index > 0
                ? '<span class="ap-step__arrow" aria-hidden="true">›</span>'
                : ''
            }
            <span class="ap-step ap-step--${state}">
              <span class="ap-step__num">${value ? icons.check(11) : index + 1}</span>
              <span class="ap-step__label">${escapeHtml(label)}</span>
              ${value ? `<span class="ap-step__value">${escapeHtml(value as string)}</span>` : ''}
            </span>
          `;
        }).join('')}
      </div>
    `;
  };

  const rail = () => `
    <aside class="ap-w-catalog__rail">
      ${
        selection.brand
          ? `<div class="ap-rail__block">
               <p class="ap-rail__title">Выбрано</p>
               <div class="ap-rail__list">
                 ${selection.brand ? railItem('brand', selection.brand.id, selection.brand.name, 'Марка') : ''}
                 ${selection.model ? railItem('model', selection.model.id, selection.model.name, 'Модель') : ''}
                 ${
                   selection.modification
                     ? railItem('modification', selection.modification.id, selection.modification.name, 'Модификация')
                     : ''
                 }
               </div>
             </div>`
          : ''
      }
      ${
        models.length
          ? `<div class="ap-rail__block">
               <p class="ap-rail__title">Модели ${escapeHtml(selection.brand?.name ?? '')}</p>
               <ul class="ap-rail__list">
                 ${models
                   .map(
                     (model) => `<li>
                       <button type="button" class="ap-rail__item${
                         selection.model?.id === model.id ? ' ap-rail__item--active' : ''
                       }" data-step="model" data-id="${escapeHtml(model.id)}">
                         ${escapeHtml(model.name)}
                       </button>
                     </li>`,
                   )
                   .join('')}
               </ul>
             </div>`
          : ''
      }
      ${
        modifications.length
          ? `<div class="ap-rail__block">
               <p class="ap-rail__title">Модификации</p>
               <ul class="ap-rail__list">
                 ${modifications
                   .map(
                     (mod) => `<li>
                       <button type="button" class="ap-rail__item${
                         selection.modification?.id === mod.id ? ' ap-rail__item--active' : ''
                       }" data-step="modification" data-id="${escapeHtml(mod.id)}">
                         ${escapeHtml(mod.name)}
                       </button>
                     </li>`,
                   )
                   .join('')}
               </ul>
             </div>`
          : ''
      }
    </aside>
  `;

  const railItem = (step: string, id: string, name: string, label: string) => `
    <button type="button" class="ap-rail__item ap-rail__item--active" data-step="${step}" data-id="${escapeHtml(id)}">
      <span class="ap-rail__flag">${escapeHtml(label)}</span>
      ${escapeHtml(name)}
    </button>
  `;

  const brandGrid = () => `
    <div class="ap-w-catalog__layout">
      ${rail()}
      <div class="ap-w-catalog__content">
        <label class="ap-label" for="ap-brand-search">Фильтр по марке</label>
        <input id="ap-brand-search" class="ap-input" type="search" placeholder="Начните вводить, например BMW" />
        <p class="ap-section-title">Марки автомобилей</p>
        <ul class="ap-rail__list" style="max-height:none;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));display:grid">
          ${brands
            .map(
              (brand) => `<li>
                <button type="button" class="ap-rail__item" data-step="brand" data-id="${escapeHtml(brand.id)}">
                  <span class="ap-rail__flag">${escapeHtml(brand.country ?? '')}</span>
                  ${escapeHtml(brand.name)}
                </button>
              </li>`,
            )
            .join('')}
        </ul>
      </div>
    </div>
  `;

  const modelGrid = () => `
    <div class="ap-w-catalog__layout">
      ${rail()}
      <div class="ap-w-catalog__content">
        <p class="ap-section-title">Модели ${escapeHtml(selection.brand?.name ?? '')}</p>
        <div class="ap-tree__level">
          ${models
            .map(
              (model) => `
            <button type="button" class="ap-node" data-step="model" data-id="${escapeHtml(model.id)}">
              <span class="ap-node__icon">${icons.catalog(17)}</span>
              <span class="ap-node__text">
                <span class="ap-node__name">${escapeHtml(model.name)}</span>
                <span class="ap-node__meta">
                  ${(model.years ?? []).length
                    ? `<span class="ap-chip">${formatYearRange(Math.min(...model.years), Math.max(...model.years))}</span>`
                    : ''}
                  <span class="ap-chip">${formatNumber(model.modificationCount)} модификаций</span>
                </span>
              </span>
              <span class="ap-node__chev">${icons.chevron(16)}</span>
            </button>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  `;

  const modificationGrid = () => `
    <div class="ap-w-catalog__layout">
      ${rail()}
      <div class="ap-w-catalog__content">
        <p class="ap-section-title">Модификации ${escapeHtml(selection.model?.name ?? '')}</p>
        <div class="ap-tree__level">
          ${modifications
            .map(
              (mod) => `
            <button type="button" class="ap-node" data-step="modification" data-id="${escapeHtml(mod.id)}">
              <span class="ap-node__icon">${icons.car(17)}</span>
              <span class="ap-node__text">
                <span class="ap-node__name">${escapeHtml(mod.name)}</span>
                <span class="ap-node__meta">
                  ${yearChip(mod)}
                  ${chip('Двигатель', mod.engine)}
                  ${chip('КПП', mod.gearbox)}
                  ${chip('Привод', mod.drive)}
                  ${chip('Кузов', mod.body)}
                  ${chip('Мощность', mod.power)}
                </span>
              </span>
              <span class="ap-node__chev">${icons.chevron(16)}</span>
            </button>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  `;

  const yearChip = (mod: Modification) => {
    const years = formatYearRange(mod.yearFrom, mod.yearTo);
    return years ? `<span class="ap-chip ap-chip--primary">${escapeHtml(years)}</span>` : '';
  };

  const chip = (label: string, value?: string | null) =>
    value ? `<span class="ap-chip">${escapeHtml(label)}: ${escapeHtml(value)}</span>` : '';

  const partsView = () => `
    <div class="ap-w-catalog__layout">
      ${rail()}
      <div class="ap-w-catalog__content">
        <div class="ap-v-card" style="margin-bottom:18px">
          <div class="ap-v-card__media">
            <div style="display:grid;place-items:center;height:100%;min-height:104px;color:var(--ap-primary)">
              ${icons.car(30)}
            </div>
          </div>
          <div class="ap-v-card__body">
            <p class="ap-v-card__name">
              ${escapeHtml(selection.brand?.name ?? '')} ${escapeHtml(selection.model?.name ?? '')}
            </p>
            <p class="ap-v-card__trim">${escapeHtml(selection.modification?.name ?? '')}</p>
            <div class="ap-v-card__meta">
              ${yearChip(selection.modification as Modification)}
              ${chip('Двигатель', selection.modification?.engine)}
              ${chip('Топливо', selection.modification?.fuel)}
              ${chip('КПП', selection.modification?.gearbox)}
              ${chip('Привод', selection.modification?.drive)}
            </div>
          </div>
        </div>
        <p class="ap-section-title">Каталог запчастей</p>
        <div data-tree></div>
        ${lastMeta ? metaStrip(lastMeta) : ''}
      </div>
    </div>
  `;

  const view = (): number => (selection.modification ? 3 : selection.model ? 2 : selection.brand ? 1 : 0);

  const bodyFor = (): string => {
    const active = view();
    if (active === 0) return brandGrid();
    if (active === 1) return modelGrid();
    if (active === 2) return modificationGrid();
    return partsView();
  };

  const render = (content = bodyFor()) => {
    container.innerHTML = card({
      title: 'Каталог запчастей по автомобилю',
      subtitle: 'Марка → модель → год → модификация, затем дерево групп с OEM-номерами и ценами.',
      icon: icons.catalog(20),
      body: steps(view()) + content,
    });
  };

  const busy = () =>
    card({
      title: 'Каталог запчастей по автомобилю',
      subtitle: 'Марка → модель → год → модификация, затем дерево групп с OEM-номерами и ценами.',
      icon: icons.catalog(20),
      body: steps(view()) + `<div>${skeletonList(4)}</div>`,
    });

  // ------------------------------------------------------------------ data
  const withAbort = () => {
    abort?.abort();
    abort = new AbortController();
    return abort.signal;
  };

  async function loadBrands(): Promise<void> {
    try {
      const response = await api.brands(undefined, withAbort());
      brands = response.items;
      lastMeta = response.meta;
      render();
    } catch (error) {
      render(errorState(message(error), hint(error)));
    }
  }

  async function loadModels(brandId: string): Promise<void> {
    try {
      const response = await api.models(brandId, withAbort());
      models = response.items;
      lastMeta = response.meta;
      render();
    } catch (error) {
      render(errorState(message(error), hint(error)));
    }
  }

  async function loadModifications(modelId: string): Promise<void> {
    try {
      const response = await api.modifications(modelId, withAbort());
      modifications = response.items;
      lastMeta = response.meta;
      render();
    } catch (error) {
      render(errorState(message(error), hint(error)));
    }
  }

  async function loadParts(vehicleId: string): Promise<void> {
    render(partsView().replace('<div data-tree></div>', `<div data-tree>${skeletonList(4)}</div>`));
    try {
      const response = await api.catalog(vehicleId, undefined, withAbort());
      lastMeta = response.meta;
      render();
      mountTree(vehicleId, response.groups);
    } catch (error) {
      render(errorState(message(error), hint(error)));
    }
  }

  function mountTree(vehicleId: string, roots: Parameters<PartsTree['setRoots']>[0]): void {
    const host = container.querySelector<HTMLElement>('[data-tree]');
    if (!host) return;
    tree?.destroy();
    tree = new PartsTree(host, {
      vehicleId,
      onAddToCart: (part) => {
        void addToCartAndShow({
          oem: part.oem ?? part.id,
          name: part.name,
          brand: part.brand,
          price: part.price,
          vehicleId,
        });
      },
    });
    tree.attach();
    tree.setRoots(roots);
  }

  // ---------------------------------------------------------------- events
  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-step]');
    if (!button) return;
    const step = button.dataset.step;
    const id = button.dataset.id as string;

    if (step === 'brand') {
      const brand = brands.find((b) => b.id === id);
      if (!brand) return;
      selection.brand = brand;
      selection.model = null;
      selection.modification = null;
      models = [];
      modifications = [];
      container.innerHTML = busy();
      void loadModels(id);
      return;
    }

    if (step === 'model') {
      const model = models.find((m) => m.id === id);
      if (!model) return;
      selection.model = model;
      selection.modification = null;
      modifications = [];
      container.innerHTML = busy();
      void loadModifications(id);
      return;
    }

    if (step === 'modification') {
      const mod = modifications.find((m) => m.id === id);
      if (!mod) return;
      selection.modification = mod;
      void loadParts(mod.id);
      return;
    }
  };

  const onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.matches('#ap-brand-search')) return;
    const query = input.value.trim().toLowerCase();
    if (!query) {
      render();
      return;
    }
    const filtered = brands.filter((b) => b.name.toLowerCase().includes(query));
    container.innerHTML = card({
      title: 'Каталог запчастей по автомобилю',
      subtitle: 'Марка → модель → год → модификация, затем дерево групп с OEM-номерами и ценами.',
      icon: icons.catalog(20),
      body:
        steps(0) +
        `<div class="ap-w-catalog__layout">${rail()}<div class="ap-w-catalog__content">
           <label class="ap-label" for="ap-brand-search">Фильтр по марке</label>
           <input id="ap-brand-search" class="ap-input" type="search" value="${escapeHtml(query)}" />
           <p class="ap-section-title">Найдено: ${filtered.length}</p>
           <div class="ap-rail__list" style="max-height:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
             ${
               filtered.length
                 ? filtered
                     .map(
                       (brand) => `<button type="button" class="ap-rail__item" data-step="brand" data-id="${escapeHtml(brand.id)}">
                          <span class="ap-rail__flag">${escapeHtml(brand.country ?? '')}</span>${escapeHtml(brand.name)}
                        </button>`,
                     )
                     .join('')
                 : `<p class="ap-state__hint">Марка не найдена. Попробуйте другое написание.</p>`
             }
           </div>
         </div></div>`,
    });
    const restored = container.querySelector<HTMLInputElement>('#ap-brand-search');
    restored?.focus();
    restored?.setSelectionRange(query.length, query.length);
  };

  container.addEventListener('click', onClick);
  container.addEventListener('input', onInput);

  render(
    selection.brand ? bodyFor() : `<div>${skeletonList(3)}</div>`,
  );
  if (!selection.brand) void loadBrands();

  return () => {
    abort?.abort();
    tree?.destroy();
    container.removeEventListener('click', onClick);
    container.removeEventListener('input', onInput);
  };
}

const message = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Не удалось загрузить данные';
const hint = (error: unknown): string | null => (error instanceof ApiError ? error.hint : null);

/** Re-exported so the demo page can render the same empty state. */
export { emptyState };

import { api } from '../core/api';
import { addToCartAndShow } from '../core/cart-modal';
import { escapeHtml, formatNumber } from '../core/format';
import { icons } from '../core/icons';
import { PartsTree } from '../core/parts-tree';
import { card, metaStrip, skeletonList } from '../core/ui';
import { ApiError, type MetaInfo, type Vehicle } from '../core/types';

export interface VinWidgetOptions {
  /** Container the widget renders into. */
  container: HTMLElement;
  /** Pre-filled VIN. */
  initialVin?: string;
  /** Pre-fetched runtime config (test VINs, active mode). */
  meta?: MetaInfo | null;
}

/**
 * Widget 1 - VIN lookup.
 *
 * Flow: VIN -> Laximo decode -> vehicle card -> lazily loaded parts tree with
 * OEM numbers, price, stock and an "В корзину" action.
 */
export function mountVinWidget(options: VinWidgetOptions): () => void {
  const { container } = options;
  let abort: AbortController | null = null;
  let tree: PartsTree | null = null;
  let meta: MetaInfo | null = options.meta ?? null;

  const renderShell = (body: string) => {
    container.innerHTML = card({
      title: 'Подбор деталей по VIN',
      subtitle:
        'Декодирование VIN через Laximo, дерево групп и деталей с OEM-номерами, ценой и остатком.',
      icon: icons.vin(20),
      body,
    });
  };

  const testVinsBlock = () => {
    const vins = meta?.testVins ?? [];
    if (!vins.length) return '';
    return `
      <div class="ap-w-vin__examples">
        <span class="ap-w-vin__examples-label">Тестовые VIN:</span>
        ${vins
          .map(
            (item) =>
              `<button type="button" class="ap-w-vin__example" data-vin="${escapeHtml(item.vin)}"
                 title="${escapeHtml(item.vehicle)}">${escapeHtml(item.vin)}</button>`,
          )
          .join('')}
      </div>
    `;
  };

  const formBlock = (vin = '', error?: { message: string; hint?: string | null } | null) => `
    <form class="ap-w-vin__form" autocomplete="off">
      <div>
        <label class="ap-label" for="ap-vin-input">VIN номер автомобиля</label>
        <div class="ap-w-vin__row">
          <input id="ap-vin-input" class="ap-input ap-input--mono" name="vin" maxlength="17"
                 placeholder="WBAVA51070FH12345" value="${escapeHtml(vin)}"
                 inputmode="latin" spellcheck="false" />
          <button type="submit" class="ap-btn ap-btn--primary">${icons.search(16)} Найти детали</button>
        </div>
      </div>
      ${
        error
          ? `<div class="ap-w-vin__error" role="alert">${icons.alert(17)}<div>
               <strong>${escapeHtml(error.message)}</strong>
               ${error.hint ? `<br />${escapeHtml(error.hint)}` : ''}
             </div></div>`
          : ''
      }
      ${testVinsBlock()}
    </form>
  `;

  const vehicleCard = (vehicle: Vehicle, childrenHtml: string, metaHtml: string) => `
    <div class="ap-v-card" style="margin-top:20px">
      <div class="ap-v-card__media">
        ${
          vehicle.imageUrl
            ? `<img src="${escapeHtml(vehicle.imageUrl)}" alt="${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}" loading="lazy" />`
            : `<div style="display:grid;place-items:center;height:100%;min-height:104px;color:var(--ap-text-muted)">${icons.car(28)}</div>`
        }
      </div>
      <div class="ap-v-card__body">
        <p class="ap-v-card__name">${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</p>
        <p class="ap-v-card__trim">${escapeHtml(vehicle.modification ?? '')}</p>
        <dl class="ap-v-card__specs">
          ${spec('Год', formatNumber(vehicle.year))}
          ${spec('Двигатель', vehicle.engine)}
          ${spec('Топливо', vehicle.fuel)}
          ${spec('КПП', vehicle.gearbox)}
          ${spec('Привод', vehicle.drive)}
          ${spec('Кузов', vehicle.body)}
          ${spec('Мощность', vehicle.power)}
          ${spec('Страна', vehicle.country)}
        </dl>
        <div class="ap-v-card__vin">
          <span class="ap-chip ap-chip--mono">${escapeHtml(vehicle.vin ?? '')}</span>
          ${(vehicle.oemPlatforms ?? []).map((p) => `<span class="ap-chip">платформа ${escapeHtml(p)}</span>`).join('')}
        </div>
      </div>
    </div>
    <p class="ap-section-title">Каталог запчастей</p>
    <div data-tree></div>
    ${childrenHtml}
    ${metaHtml}
  `;

  const spec = (label: string, value?: string | null) => `
    <div class="ap-v-card__spec">
      <dt>${escapeHtml(label)}</dt>
      <dd title="${escapeHtml(value ?? '')}">${escapeHtml(value && value.trim() ? value : '—')}</dd>
    </div>
  `;

  const renderInitial = () => renderShell(formBlock(options.initialVin ?? ''));

  async function loadMeta(): Promise<void> {
    if (meta) return;
    try {
      meta = await api.meta();
    } catch {
      meta = null;
    }
  }

  async function decode(vin: string): Promise<void> {
    abort?.abort();
    abort = new AbortController();

    renderShell(`${formBlock(vin)}<div style="margin-top:20px">${skeletonList(4)}</div>`);

    try {
      const response = await api.decodeVin(vin, abort.signal);
      renderShell(
        `${formBlock(vin)}
         ${vehicleCard(response.vehicle, '', metaStrip(response.meta))}`,
      );

      const host = container.querySelector<HTMLElement>('[data-tree]');
      if (host) {
        tree?.destroy();
        tree = new PartsTree(host, {
          vehicleId: response.vehicle.vehicleId,
          onAddToCart: (part) => {
            void addToCartAndShow({
              oem: part.oem ?? part.id,
              name: part.name,
              brand: part.brand,
              price: part.price,
              vehicleId: response.vehicle.vehicleId,
            });
          },
        });
        tree.attach();
        tree.setRoots(response.groups);
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      if (error instanceof ApiError) {
        renderShell(
          formBlock(vin, { message: error.message, hint: error.hint }),
        );
        return;
      }
      renderShell(formBlock(vin, { message: 'Внутренняя ошибка', hint: 'Попробуйте повторить запрос.' }));
    }
  }

  // ---------------------------------------------------------------- events
  const onSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('[name="vin"]');
    const vin = (input?.value ?? '').trim();
    if (!vin) {
      renderShell(formBlock(vin, { message: 'Введите VIN', hint: '17 символов, латиница и цифры.' }));
      return;
    }
    void decode(vin);
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const example = target.closest<HTMLElement>('[data-vin]');
    if (!example) return;
    void decode(example.dataset.vin as string);
  };

  container.addEventListener('submit', onSubmit);
  container.addEventListener('click', onClick);

  void loadMeta().then(() => {
    if (container.querySelector('[data-vin]')) return;
    renderInitial();
  });

  return () => {
    abort?.abort();
    tree?.destroy();
    container.removeEventListener('submit', onSubmit);
    container.removeEventListener('click', onClick);
  };
}

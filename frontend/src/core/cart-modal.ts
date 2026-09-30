import { api } from './api';
import { cartStore } from './cart-store';
import { escapeHtml, formatPrice, prettyJson } from './format';
import { icons } from './icons';
import { ApiError } from './types';
import type { CartResult } from './types';

/**
 * "В корзину" -> ABCP.
 *
 * The button does not call the shop directly: it posts the selection to our
 * backend, which answers with the exact ABCP request body. Showing that body
 * in the demo is deliberate - it lets the client verify the integration contract
 * against their own test environment without reading our code.
 */
export async function addToCartAndShow(
  part: {
    oem: string;
    name: string;
    price?: number | null;
    brand?: string | null;
    vehicleId?: string | null;
  },
): Promise<void> {
  const pending = openModal(
    `<div class="ap-state" role="status">
       <div class="ap-state__icon"><span class="ap-spinner"></span></div>
       <p class="ap-state__title">Добавляем в корзину…</p>
       <p class="ap-state__hint">Формируется запрос к ABCP через backend-прокси.</p>
     </div>`,
    { title: 'Передача в корзину ABCP' },
  );

  try {
    const result = await api.addToCart([
      {
        oem: part.oem,
        name: part.name,
        brand: part.brand ?? undefined,
        price: part.price ?? undefined,
        vehicleId: part.vehicleId ?? undefined,
        quantity: 1,
      },
    ]);
    cartStore.add({
      oem: part.oem,
      name: part.name,
      brand: part.brand ?? null,
      price: part.price ?? null,
      vehicleId: part.vehicleId ?? null,
      quantity: 1,
    });
    cartStore.setResult(result);
    pending.update(renderResult(result));
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Не удалось связаться с сервером';
    const hint = error instanceof ApiError ? error.hint : null;
    pending.update(`
      <div class="ap-state ap-state--error" role="alert">
        <div class="ap-state__icon">${icons.alert(20)}</div>
        <p class="ap-state__title">${escapeHtml(message)}</p>
        ${hint ? `<p class="ap-state__hint">${escapeHtml(hint)}</p>` : ''}
      </div>
    `);
  }
}

function renderResult(result: CartResult): string {
  const simulated = result.mode === 'simulated';
  return `
    <div class="ap-summary">
      <div class="ap-summary__row">
        <span>Режим интеграции</span>
        <span class="ap-chip ${simulated ? 'ap-chip--warning' : 'ap-chip--success'}">
          ${simulated ? 'симуляция (нет ключа ABCP)' : 'живая отправка в ABCP'}
        </span>
      </div>
      <div class="ap-summary__row">
        <span>Позиций в корзине</span>
        <span>${result.lines.length}</span>
      </div>
      <div class="ap-summary__row ap-summary__row--total">
        <span>Сумма</span>
        <span>${formatPrice(result.totalAmount, result.currency ?? 'RUB')}</span>
      </div>
    </div>

    <p class="ap-section-title">Тело запроса в ABCP</p>
    <pre class="ap-code">${escapeHtml(prettyJson(result.request))}</pre>

    <p class="ap-meta">
      <span class="ap-meta__note">
        ${
          simulated
            ? 'ABCP-ключ не задан, поэтому запрос сформирован, но не отправлен. С тестовыми '
              + 'доступами заказчика тот же JSON уходит в тестовую среду ABCP.'
            : escapeHtml(result.message ?? 'Запрос отправлен в тестовую среду ABCP.')
        }
      </span>
    </p>
  `;
}

interface PendingModal {
  update: (html: string) => void;
  close: () => void;
  /** Body element, so callers can wire their own controls inside the modal. */
  body: HTMLElement;
}

/** Opens a modal shell and returns handles to swap content or dismiss it. */
export function openModal(bodyHtml: string, options: { title: string }): PendingModal {
  const overlay = document.createElement('div');
  overlay.className = 'ap-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };

  overlay.innerHTML = `
    <div class="ap-modal__panel">
      <header class="ap-modal__head">
        <h3 class="ap-modal__title">${escapeHtml(options.title)}</h3>
        <button type="button" class="ap-modal__close" aria-label="Закрыть">×</button>
      </header>
      <div class="ap-modal__body"></div>
      <footer class="ap-modal__foot">
        <button type="button" class="ap-btn ap-btn--ghost" data-close>Закрыть</button>
        <button type="button" class="ap-btn ap-btn--primary" data-view-cart>Открыть корзину</button>
      </footer>
    </div>
  `;

  const body = overlay.querySelector<HTMLElement>('.ap-modal__body') as HTMLElement;
  body.innerHTML = bodyHtml;

  overlay.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target === overlay || target.closest('[data-close]')) close();
    if (target.closest('[data-view-cart]')) {
      close();
      window.dispatchEvent(new CustomEvent('autoparts:open-cart'));
    }
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  overlay.querySelector<HTMLButtonElement>('[data-close]')?.focus();

  return { update: (html: string) => (body.innerHTML = html), close, body };
}

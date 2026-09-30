import { cartStore } from './cart-store';
import { escapeHtml, formatPrice } from './format';
import { icons } from './icons';
import { openModal } from './cart-modal';
import type { CartLine } from './types';

/**
 * Floating cart button + basket modal.
 *
 * Emits `autoparts:open-cart` on `window` so a host page can react (open its own
 * basket, navigate to checkout, ...). A real shop usually replaces this component
 * with its own - which is exactly why the cart state lives in `CartStore` and is
 * not tied to any rendering.
 */
export function mountCartButton(container: HTMLElement): () => void {
  const unsubscribe = cartStore.subscribe(() => renderButton());
  const onOpenRequest = () => openBasket();
  window.addEventListener('autoparts:open-cart', onOpenRequest);

  container.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.ap-cart')) openBasket();
  });

  function renderButton(): void {
    const count = cartStore.getCount();
    container.innerHTML = `
      <button type="button" class="ap-cart" aria-label="Корзина, товаров: ${count}">
        ${icons.cart(17)}
        <span>Корзина</span>
        ${count ? `<span class="ap-cart__badge">${count}</span>` : ''}
      </button>
    `;
  }

  function openBasket(): void {
    const items = cartStore.getItems();
    const payload = cartStore.getResult()?.request ?? null;

    if (!items.length) {
      openModal(
        `<div class="ap-state">
           <div class="ap-state__icon">${icons.cart(20)}</div>
           <p class="ap-state__title">Корзина пуста</p>
           <p class="ap-state__hint">Выберите деталь в каталоге или по OEM-номеру и нажмите «В корзину».</p>
         </div>`,
        { title: 'Корзина' },
      );
      return;
    }

    const lines: CartLine[] = items.map((item) => ({
      oem: item.oem,
      brand: item.brand,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      amount: (item.price ?? 0) * item.quantity,
      inStock: true,
      supplier: '—',
    }));

    const modal = openModal(renderBody(lines, payload), { title: 'Корзина' });

    modal.body.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const up = target.closest<HTMLElement>('[data-qty-up]');
      const down = target.closest<HTMLElement>('[data-qty-down]');
      const remove = target.closest<HTMLElement>('[data-remove]');

      if (up) {
        const oem = up.dataset.qtyUp as string;
        const item = cartStore.getItems().find((entry) => entry.oem === oem);
        cartStore.setQuantity(oem, (item?.quantity ?? 0) + 1);
      } else if (down) {
        const oem = down.dataset.qtyDown as string;
        const item = cartStore.getItems().find((entry) => entry.oem === oem);
        cartStore.setQuantity(oem, (item?.quantity ?? 1) - 1);
      } else if (remove) {
        cartStore.remove(remove.dataset.remove as string);
      } else {
        return;
      }

      // Re-open so the modal reflects the new quantities.
      modal.close();
      openBasket();
    });
  }

  function renderBody(lines: CartLine[], payload: unknown): string {
    const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
    return `
      <div class="ap-cart__lines">
        ${lines
          .map(
            (line) => `
          <div class="ap-cart__line">
            <div class="ap-cart__line-body">
              <div class="ap-cart__line-name">${escapeHtml(line.name ?? '')}</div>
              <div class="ap-cart__line-oem">${escapeHtml(line.oem)}${
                line.brand ? ` · ${escapeHtml(line.brand)}` : ''
              }</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <button type="button" class="ap-cart__remove" data-qty-down="${escapeHtml(line.oem)}"
                      aria-label="Уменьшить количество">−</button>
              <span style="min-width:22px;text-align:center;font-weight:700">${line.quantity}</span>
              <button type="button" class="ap-cart__remove" data-qty-up="${escapeHtml(line.oem)}"
                      aria-label="Увеличить количество">+</button>
            </div>
            <div class="ap-cart__line-amount">${formatPrice(line.amount)}</div>
            <button type="button" class="ap-cart__remove" data-remove="${escapeHtml(line.oem)}"
                    aria-label="Удалить из корзины">×</button>
          </div>`,
          )
          .join('')}
      </div>

      <div class="ap-summary" style="margin-top:16px">
        <div class="ap-summary__row ap-summary__row--total">
          <span>Итого</span>
          <span>${formatPrice(total)}</span>
        </div>
      </div>

      ${
        payload
          ? `<p class="ap-section-title">Тело запроса, которое уходит в ABCP</p>
             <pre class="ap-code">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`
          : ''
      }
    `;
  }

  renderButton();

  return () => {
    unsubscribe();
    window.removeEventListener('autoparts:open-cart', onOpenRequest);
  };
}

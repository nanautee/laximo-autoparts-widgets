import baseStyles from './styles/base.css?url';
import widgetStyles from './styles/widgets.css?url';
import { cartStore } from './core/cart-store';
import { addToCartAndShow } from './core/cart-modal';
import { getApiBaseUrl } from './core/api';
import { mountCatalogWidget } from './widgets/catalog-widget';
import { mountOemWidget } from './widgets/oem-widget';
import { mountVinWidget } from './widgets/vin-widget';

/**
 * Embeddable widget bundle.
 *
 * A shop page integrates it with one script tag and one call:
 *
 * ```html
 * <script src="/autoparts-widgets.js"></script>
 * <div id="autoparts-vin"></div>
 * <script>
 *   window.AutopartsWidgets.mount('vin', '#autoparts-vin', { initialVin: 'WBAVA51070FH12345' });
 * </script>
 * ```
 *
 * Styles are injected from the same bundle, so no extra stylesheet link is
 * needed. `window.__AUTOPARTS_CONFIG__.apiBase` points the widgets at the
 * shop's backend, so the Laximo/ABCP keys never reach the browser.
 */

export interface MountOptions {
  initialVin?: string;
  initialNumber?: string;
  apiBase?: string;
}

export type WidgetName = 'vin' | 'catalog' | 'oem';

type Cleanup = () => void;

const instances = new Map<WidgetName, Cleanup>();

/** Injects the widget stylesheet once per page, from the bundle itself. */
function ensureStyles(): void {
  for (const href of [baseStyles, widgetStyles]) {
    if (!href || document.querySelector(`link[data-ap-style="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.apStyle = href;
    document.head.appendChild(link);
  }
}

function resolveContainer(target: string | HTMLElement): HTMLElement {
  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`[autoparts] container not found: ${String(target)}`);
  return element;
}

function mount(name: WidgetName, target: string | HTMLElement, options: MountOptions = {}): Cleanup {
  if (options.apiBase) {
    (window as unknown as { __AUTOPARTS_CONFIG__?: { apiBase?: string } }).__AUTOPARTS_CONFIG__ = {
      apiBase: options.apiBase,
    };
  }

  ensureStyles();
  const container = resolveContainer(target);
  instances.get(name)?.();
  container.innerHTML = '';

  const cleanup =
    name === 'vin'
      ? mountVinWidget({ container, initialVin: options.initialVin })
      : name === 'catalog'
        ? mountCatalogWidget({ container })
        : mountOemWidget({ container, initialNumber: options.initialNumber });

  instances.set(name, cleanup);
  return cleanup;
}

/** Adds a part to the shared cart and shows the ABCP payload. */
function addToCart(part: { oem: string; name: string; price?: number | null; vehicleId?: string | null }) {
  cartStore.add({ ...part, quantity: 1 });
  void addToCartAndShow(part);
}

const api = {
  /** Mounts a widget by name. */
  mount,
  unmount: (name: WidgetName) => {
    instances.get(name)?.();
    instances.delete(name);
  },
  /** Mounts all three widgets into their default containers. */
  mountAll: (options: MountOptions = {}): void => {
    mount('vin', '#autoparts-vin', options);
    mount('catalog', '#autoparts-catalog');
    mount('oem', '#autoparts-oem');
  },
  addToCart,
  getApiBaseUrl,
  cartStore,
};

export { mountCatalogWidget, mountOemWidget, mountVinWidget };
export type { Cleanup };

(window as unknown as { AutopartsWidgets?: typeof api }).AutopartsWidgets = api;

export default api;

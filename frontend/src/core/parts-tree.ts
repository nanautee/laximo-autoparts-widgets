import { api } from './api';
import { cartStore } from './cart-store';
import { escapeHtml, formatPrice, formatStock } from './format';
import { icons } from './icons';
import { errorState, loadingState, skeletonList } from './ui';
import type { CatalogNode } from './types';

export interface PartsTreeOptions {
  /** Called when the visitor presses "В корзину" on a concrete part. */
  onAddToCart: (part: CatalogNode) => void;
  /** Label of the vehicle used in the cart reference, if any. */
  vehicleId?: string;
}

/**
 * Lazy, level-by-level parts tree.
 *
 * The real catalog of a single vehicle has thousands of nodes, so the widget
 * never downloads the whole tree: it asks for one level at a time and caches
 * what it already fetched (the backend caches the same levels in Redis). The
 * component keeps a small in-memory map so re-opening a group is instant.
 */
export class PartsTree {
  private readonly host: HTMLElement;

  private readonly options: PartsTreeOptions;

  private readonly children = new Map<string, CatalogNode[]>();

  private readonly open = new Set<string>();

  private readonly loading = new Set<string>();

  private readonly errors = new Map<string, string>();

  private roots: CatalogNode[] = [];

  private readonly unsubscribe: () => void;

  constructor(host: HTMLElement, options: PartsTreeOptions) {
    this.host = host;
    this.options = options;
    this.unsubscribe = cartStore.subscribe(() => this.syncCartButtons());
  }

  destroy(): void {
    this.unsubscribe();
  }

  setRoots(nodes: CatalogNode[]): void {
    this.roots = nodes;
    this.open.clear();
    this.children.clear();
    this.render();
  }

  render(): void {
    if (!this.roots.length) {
      this.host.innerHTML = `<div class="ap-tree">${skeletonList(3)}</div>`;
      return;
    }
    this.host.innerHTML = `<div class="ap-tree">${this.renderLevel(this.roots, 'root')}</div>`;
  }

  private renderLevel(nodes: CatalogNode[], parentKey: string): string {
    if (this.loading.has(parentKey)) return skeletonList(2);
    if (this.errors.has(parentKey)) return errorState(this.errors.get(parentKey) as string);
    if (!nodes.length) {
      return `<p class="ap-state__hint" style="padding:12px 4px">В этой группе нет деталей.</p>`;
    }
    return nodes.map((node) => this.renderNode(node, parentKey)).join('');
  }

  private renderNode(node: CatalogNode, parentKey: string): string {
    if (node.kind === 'PART') return this.renderPart(node);
    const key = node.id;
    const isOpen = this.open.has(key);
    const cached = this.children.get(key);
    const isLoading = this.loading.has(key);

    const childBlock = isOpen
      ? `<div class="ap-tree__children">${
          cached ? this.renderLevel(cached, key) : this.loading.has(key) ? skeletonList(2) : ''
        }</div>`
      : '';

    return `
      <div>
        <button type="button"
                class="ap-node${isOpen ? ' ap-node--open' : ''}${isLoading ? ' ap-node--loading' : ''}"
                data-group="${escapeHtml(key)}"
                data-parent="${escapeHtml(parentKey)}"
                aria-expanded="${isOpen}">
          <span class="ap-node__icon">${icons.folder(17)}</span>
          <span class="ap-node__text">
            <span class="ap-node__name">${escapeHtml(node.name)}</span>
            ${
              node.nameRu && node.nameRu !== node.name
                ? `<span class="ap-node__meta"><span class="ap-chip">${escapeHtml(node.nameRu)}</span></span>`
                : ''
            }
          </span>
          <span class="ap-node__chev">${icons.chevron(16)}</span>
        </button>
        ${childBlock}
      </div>
    `;
  }

  private renderPart(node: CatalogNode): string {
    const oem = node.oem ?? node.id;
    const inCart = cartStore.has(oem);
    return `
      <div class="ap-node ap-node--part" data-part="${escapeHtml(oem)}">
        <span class="ap-node__icon">${icons.box(17)}</span>
        <span class="ap-node__text">
          <span class="ap-node__name">${escapeHtml(node.name)}</span>
          <span class="ap-node__meta">
            <span class="ap-chip ap-chip--mono ap-chip--primary">OEM ${escapeHtml(oem)}</span>
            ${
              node.brand
                ? `<span class="ap-chip">${escapeHtml(node.brand)}</span>`
                : ''
            }
            ${
              node.inStock === false
                ? '<span class="ap-chip ap-chip--danger">Нет в наличии</span>'
                : '<span class="ap-chip ap-chip--success">В наличии</span>'
            }
          </span>
        </span>
        <span class="ap-node__price">
          ${formatPrice(node.price, node.currency ?? 'RUB')}
          <span class="ap-node__stock${node.inStock === false ? ' ap-node__stock--out' : ''}">
            ${formatStock(node.stockCount, node.inStock)}
          </span>
        </span>
        <button type="button"
                class="ap-btn ap-btn--primary ap-btn--cart"
                data-add="${escapeHtml(oem)}"
                ${node.inStock === false ? 'disabled' : ''}>
          ${inCart ? `${icons.check(15)} В корзине` : `${icons.cart(15)} В корзину`}
        </button>
      </div>
    `;
  }

  /** Wires the (single) delegated listener for the whole tree. */
  attach(): void {
    this.host.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const groupButton = target.closest<HTMLElement>('[data-group]');
      if (groupButton) {
        event.preventDefault();
        void this.toggleGroup(groupButton.dataset.group as string);
        return;
      }
      const addButton = target.closest<HTMLElement>('[data-add]');
      if (addButton) {
        event.preventDefault();
        const oem = addButton.dataset.add as string;
        const node = this.findPart(oem);
        if (node) this.options.onAddToCart(node);
      }
    });
  }

  private findPart(oem: string): CatalogNode | undefined {
    const search = (nodes: CatalogNode[]): CatalogNode | undefined => {
      for (const node of nodes) {
        if (node.kind === 'PART' && (node.oem ?? node.id) === oem) return node;
        const found = node.children?.length ? search(node.children) : undefined;
        if (found) return found;
      }
      return undefined;
    };
    for (const list of [this.roots, ...this.children.values()]) {
      const found = search(list);
      if (found) return found;
    }
    return undefined;
  }

  private async toggleGroup(groupId: string): Promise<void> {
    if (this.open.has(groupId)) {
      this.open.delete(groupId);
      this.render();
      return;
    }
    this.open.add(groupId);
    this.render();

    if (this.children.has(groupId) || !this.options.vehicleId) return;

    this.loading.add(groupId);
    this.errors.delete(groupId);
    this.render();
    try {
      const response = await api.catalog(this.options.vehicleId, groupId);
      this.children.set(groupId, response.groups);
    } catch (error) {
      this.errors.set(groupId, error instanceof Error ? error.message : 'Не удалось загрузить группу');
    } finally {
      this.loading.delete(groupId);
      this.render();
    }
  }

  /** Cheap cart-state sync: only buttons change, no re-fetch. */
  private syncCartButtons(): void {
    this.host.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) => {
      const oem = button.dataset.add as string;
      if (!oem) return;
      const inCart = cartStore.has(oem);
      button.innerHTML = inCart ? `${icons.check(15)} В корзине` : `${icons.cart(15)} В корзину`;
      button.classList.toggle('ap-btn--primary', !inCart);
      button.classList.toggle('ap-btn--ghost', inCart);
    });
  }

  static loading(): string {
    return loadingState('Загрузка каталога деталей…');
  }
}

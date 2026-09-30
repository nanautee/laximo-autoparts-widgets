import type { CartResult } from './types';

export interface DraftPart {
  oem: string;
  name: string;
  price?: number | null;
  brand?: string | null;
  vehicleId?: string | null;
  quantity: number;
}

/**
 * Tiny observable store for the cart.
 *
 * A widget must not depend on a framework, so state is kept in a plain object
 * with a subscriber list. Every widget instance can listen and re-render.
 */
export class CartStore {
  private items: DraftPart[] = [];

  private lastResult: CartResult | null = null;

  private readonly listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  getItems(): DraftPart[] {
    return this.items;
  }

  getResult(): CartResult | null {
    return this.lastResult;
  }

  getCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  }

  has(oem: string): boolean {
    return this.items.some((item) => item.oem === oem);
  }

  add(part: DraftPart): void {
    const existing = this.items.find((item) => item.oem === part.oem);
    if (existing) {
      existing.quantity += part.quantity;
    } else {
      this.items.push({ ...part });
    }
    this.emit();
  }

  setQuantity(oem: string, quantity: number): void {
    const item = this.items.find((entry) => entry.oem === oem);
    if (!item) return;
    item.quantity = quantity;
    this.items = this.items.filter((entry) => entry.quantity > 0);
    this.emit();
  }

  remove(oem: string): void {
    this.items = this.items.filter((item) => item.oem !== oem);
    this.emit();
  }

  clear(): void {
    this.items = [];
    this.lastResult = null;
    this.emit();
  }

  setResult(result: CartResult | null): void {
    this.lastResult = result;
    this.emit();
  }
}

/** Shared across widget instances on a page, like a shop's basket would be. */
export const cartStore = new CartStore();

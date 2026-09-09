import type { StockItem } from '../domain/stockItem';

// Stand-in for the real API — same async signatures the HTTP calls will have,
// so the hook does not change when `PATCH /items/:id` and `DELETE /items/:id`
// exist (see currentUserService in `home` for the same approach).
//
// Kept in memory so the Materials screen can reflect an edit or a delete
// while the app is open; a reload brings the seed items back.
const items = new Map<string, StockItem>();

export function seedStockItems(seed: readonly StockItem[]): void {
  items.clear();
  seed.forEach(item => items.set(item.id, item));
}

export async function fetchStockItems(): Promise<StockItem[]> {
  return Promise.resolve([...items.values()]);
}

export async function updateStockItem(item: StockItem): Promise<StockItem> {
  items.set(item.id, item);
  return Promise.resolve(item);
}

export async function deleteStockItem(id: string): Promise<void> {
  items.delete(id);
  return Promise.resolve();
}

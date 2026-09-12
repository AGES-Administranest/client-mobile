import type { StockItem } from '../domain/stockItem';

// Stand-in for the real API — same async signatures the HTTP calls will have,
// so the hook does not change when `GET/PATCH/DELETE /items` exist (see
// currentUserService in `home` for the same approach).
//
// Kept in memory so the screen can reflect an edit or a delete while the app
// is open; a reload brings the seed items back.
const SEED: readonly StockItem[] = [
  {
    id: 'item-propofol',
    category: 'anesthetic',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    defaultUnitCost: 19.9,
    currentQuantity: 8,
    minimumStock: 10,
    expirationDate: '2027-03-31',
  },
  {
    id: 'item-dipirona',
    category: 'medication',
    name: 'Dipirona 500mg/ml',
    unit: 'ml',
    defaultUnitCost: 12,
    currentQuantity: 5,
    minimumStock: 2,
    expirationDate: '2030-10-15',
  },
  {
    id: 'item-seringa',
    category: 'disposable',
    name: 'Seringa 5ml',
    unit: 'box',
    defaultUnitCost: 32.5,
    currentQuantity: 3,
    minimumStock: 1,
    expirationDate: null,
  },
];

const items = new Map<string, StockItem>(SEED.map(item => [item.id, item]));

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

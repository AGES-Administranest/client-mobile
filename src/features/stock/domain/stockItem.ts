// Framework-free model of a stock item as the edit form sees it.
//
// `category` and `expirationDate` come from the Figma form but have no column
// on the backend's `item` table yet (expiry lives on `item_lot`). They stay
// here so the UI matches the design; the service maps them when the API exists.
export type StockCategory = 'medication' | 'anesthetic' | 'disposable';

export const STOCK_CATEGORIES: readonly StockCategory[] = [
  'medication',
  'anesthetic',
  'disposable',
];

export type StockItem = {
  id: string;
  category: StockCategory;
  name: string;
  unitCost: number;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  /** ISO date (`YYYY-MM-DD`), or `null` when the item has no expiry. */
  expirationDate: string | null;
};

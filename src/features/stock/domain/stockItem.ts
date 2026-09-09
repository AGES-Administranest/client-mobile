// Framework-free model of a stock item, mirroring the backend `item` table
// (snake_case there → camelCase here; enum values lowercase, as the rest of
// the app does).
//
// `category` and `expirationDate` come from the Figma form but have no column
// on `item` (expiry lives on `item_lot`). They stay here so the UI matches the
// design; the team still has to decide where they land in the schema.

/** `measurement_unit_enum` */
export type MeasurementUnit =
  | 'unit'
  | 'ampoule'
  | 'vial'
  | 'box'
  | 'ml'
  | 'mg'
  | 'tablet'
  | 'other';

export const MEASUREMENT_UNITS: readonly MeasurementUnit[] = [
  'unit',
  'ampoule',
  'vial',
  'box',
  'ml',
  'mg',
  'tablet',
  'other',
];

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
  unit: MeasurementUnit;
  /** `default_unit_cost` — suggested cost for a new lot. */
  defaultUnitCost: number;
  /** `current_quantity` — cache derived from stock movements. */
  currentQuantity: number;
  /** `minimum_stock` — below this the item raises a low-stock alert. */
  minimumStock: number;
  /** ISO date (`YYYY-MM-DD`), or `null` when the item has no expiry. */
  expirationDate: string | null;
};

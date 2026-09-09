import type { StockItem } from './stockItem';

export type StockItemErrorCode =
  | 'required'
  | 'mustBeNonNegative'
  | 'invalidDate';

/** Which fields failed and why. Empty object = valid. */
export type StockItemErrors = Partial<
  Record<keyof Omit<StockItem, 'id'>, StockItemErrorCode>
>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Pure rule: decides what an acceptable item looks like. No I/O, no React —
// the hook calls this before touching the service, and the tests call it
// directly with plain objects.
export function validateStockItem(
  item: Omit<StockItem, 'id'>,
): StockItemErrors {
  const errors: StockItemErrors = {};

  if (!item.category) errors.category = 'required';
  if (item.name.trim() === '') errors.name = 'required';
  if (!item.unit) errors.unit = 'required';

  if (Number.isNaN(item.defaultUnitCost)) errors.defaultUnitCost = 'required';
  else if (item.defaultUnitCost < 0)
    errors.defaultUnitCost = 'mustBeNonNegative';

  if (Number.isNaN(item.currentQuantity)) errors.currentQuantity = 'required';
  else if (item.currentQuantity < 0)
    errors.currentQuantity = 'mustBeNonNegative';

  if (Number.isNaN(item.minimumStock)) errors.minimumStock = 'required';
  else if (item.minimumStock < 0) errors.minimumStock = 'mustBeNonNegative';

  if (item.expirationDate !== null && !isValidIsoDate(item.expirationDate)) {
    errors.expirationDate = 'invalidDate';
  }

  return errors;
}

export function isStockItemValid(errors: StockItemErrors): boolean {
  return Object.keys(errors).length === 0;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

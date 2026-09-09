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
  if (item.unit.trim() === '') errors.unit = 'required';

  if (Number.isNaN(item.unitCost)) errors.unitCost = 'required';
  else if (item.unitCost < 0) errors.unitCost = 'mustBeNonNegative';

  if (Number.isNaN(item.quantity)) errors.quantity = 'required';
  else if (item.quantity < 0) errors.quantity = 'mustBeNonNegative';

  if (Number.isNaN(item.minimumQuantity)) errors.minimumQuantity = 'required';
  else if (item.minimumQuantity < 0)
    errors.minimumQuantity = 'mustBeNonNegative';

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

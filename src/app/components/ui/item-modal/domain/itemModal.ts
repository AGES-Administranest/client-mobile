import { parseDateInput } from 'shared/utils/inputMasks';

export type StockItem = {
  id: string;
  name: string;
  category: string;
  unitCost: number;
  unit: string;
  quantity: number;
  minQuantity: number;
  expiration: string | null;
};

export function filterStockItems(
  query: string,
  items: readonly StockItem[],
): StockItem[] {
  const normalized = normalize(query);
  if (normalized.length === 0) return [...items];
  return items.filter(item => normalize(item.name).includes(normalized));
}

export function shouldShowAddOption(
  query: string,
  matches: readonly StockItem[],
): boolean {
  return normalize(query).length > 0 && matches.length === 0;
}

export function shouldShowMinQuantity(selectedItem: StockItem | null): boolean {
  return selectedItem === null;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatExpiration(
  expiration: string | null,
  locale: string,
): string {
  if (!expiration) return '';

  const [year, month, day] = expiration.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function toDateInput(isoDate: string | null): string {
  if (!isoDate) return '';

  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return '';

  return `${day}/${month}/${year}`;
}

export function isPastDate(value: string, today: Date = new Date()): boolean {
  const parsed = parseDateInput(value);
  if (!parsed) return false;

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return parsed < todayMidnight;
}

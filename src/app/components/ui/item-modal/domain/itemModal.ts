export type ItemCategory = 'medication' | 'anesthetic' | 'disposable';

export type StockItem = {
  id: string;
  name: string;
  category: ItemCategory;
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

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCurrency(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 0) return '';
  const cents = parseInt(digits, 10);
  const reais = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, '0');
  const reaisWithThousands = reais
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisWithThousands},${remainder}`;
}

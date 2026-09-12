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

  // `new Date('2027-03-31')` é interpretado como meia-noite UTC; formatado em
  // um fuso negativo (BRT é UTC-3) isso cai no dia anterior. Como validade é
  // uma data sem hora, ela é montada no fuso local.
  const [year, month, day] = expiration.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatDateInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(part => part.length > 0).join('/');
}

export function isPastDate(value: string, today: Date = new Date()): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 8) return false;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const parsed = new Date(year, month - 1, day);

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return parsed < todayMidnight;
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

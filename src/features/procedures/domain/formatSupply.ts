import { formatCurrency } from 'shared/utils/currency';

export function formatSupplyQuantity(quantity: number, locale: string): string {
  return quantity.toLocaleString(locale, { maximumFractionDigits: 3 });
}

// Supplies are an expense, so a non-zero total is shown as a deduction
// ("– R$ 33,90"), matching the Figma summary card.
export function formatSupplyTotalCost(total: number, locale: string): string {
  const formatted = formatCurrency(total, locale);

  return total > 0 ? `– ${formatted}` : formatted;
}

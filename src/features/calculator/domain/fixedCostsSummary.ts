export type FixedCostsSummary = {
  professionalExpenses: number;
  personalExpenses: number;
  equipmentDepreciation: number;
  transportCost: number;
  total: number;
};

export type TransportCostError = 'required' | 'notNumeric' | 'negative';

// transport_monthly é decimal(14,2): 14 dígitos no total, 12 inteiros e 2
// centavos. Acima disso o number perde precisão e o valor mostrado deixa de
// ser o digitado.
export const MAX_CURRENCY_DIGITS = 14;

// Dígitos viram centavos ("35000" -> "350,00"); um "-" inicial é mantido para
// que o valor negativo chegue à validação em vez de sumir da máscara.
export function maskCurrencyInput(value: string): string {
  const isNegative = value.trim().startsWith('-');
  const rawDigits = value.replace(/\D/g, '');

  if (!rawDigits) {
    return isNegative ? '-' : '';
  }

  const padded = rawDigits
    .replace(/^0+/, '')
    .slice(0, MAX_CURRENCY_DIGITS)
    .padStart(3, '0');
  const cents = padded.slice(-2);
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${isNegative ? '-' : ''}${integer},${cents}`;
}

export function formatAmountInput(value: number): string {
  return maskCurrencyInput(String(Math.round(value * 100)));
}

// "1.225,00" -> 1225; null para vazio ou qualquer coisa não numérica.
export function parseCurrencyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateTransportCost(
  value: string,
): TransportCostError | null {
  if (!value.trim()) {
    return 'required';
  }

  const amount = parseCurrencyInput(value);
  if (amount === null) {
    return 'notNumeric';
  }

  return amount < 0 ? 'negative' : null;
}

export type MaskedAmount = string;

// Até R$ 9.999.999.999,99: cabe com folga no decimal(14,2) do backend.
const MAX_DIGITS = 12;
const MASKED_AMOUNT = /^\d{1,3}(\.\d{3})*,\d{2}$/;

export function maskAmountInput(value: string): MaskedAmount {
  const digits = value
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .slice(0, MAX_DIGITS);
  if (!digits) {
    return '';
  }
  const padded = digits.padStart(3, '0');
  const reais = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = padded.slice(-2);
  return `${reais},${centavos}`;
}

export function parseMaskedAmount(value: MaskedAmount): number | null {
  const trimmed = value.trim();
  if (!MASKED_AMOUNT.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(/\./g, '').replace(',', '.'));
}

// Até R$ 9.999.999.999,99: cabe com folga no decimal(14,2) do backend.
const MAX_DIGITS = 12;
const MASKED_AMOUNT = /^\d{1,3}(\.\d{3})*,\d{2}$/;

/**
 * Máscara de centavos: cada dígito entra pela direita ("12345" → "123,45").
 * Qualquer coisa que não seja dígito é descartada, então "-5" vira "0,05" e
 * nunca um valor negativo.
 */
export function maskAmountInput(value: string): string {
  const digits = value
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .slice(0, MAX_DIGITS);
  if (!digits) {
    return '';
  }
  const padded = digits.padStart(3, '0');
  const reais = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reais},${padded.slice(-2)}`;
}

/**
 * Lê só o formato que a máscara produz. Por isso "2.5" ou "abc" dão null em
 * vez de virarem 25 (o erro de quem apaga todos os pontos antes de converter).
 */
export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!MASKED_AMOUNT.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(/\./g, '').replace(',', '.'));
}

export type EntryDate = { day: number; month: number; year: number };

export type MaskedDate = string;

const MASKED_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
// O extrato (GET /financial-entries) só consulta anos de 2000 a 2100: um
// lançamento fora disso seria salvo, mas nunca apareceria em lugar nenhum.
const FIRST_YEAR = 2000;
const LAST_YEAR = 2100;

export function maskDateInput(value: string): MaskedDate {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseEntryDate(value: MaskedDate): EntryDate | null {
  const match = MASKED_DATE.exec(value.trim());
  if (!match) {
    return null;
  }
  const [day, month, year] = [match[1], match[2], match[3]].map(Number);
  const isQueryableYear = year >= FIRST_YEAR && year <= LAST_YEAR;
  if (!isQueryableYear || month < 1 || month > 12) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  const existsInCalendar =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return existsInCalendar ? { day, month, year } : null;
}

/**
 * Meio-dia em UTC: o extrato agrupa por mês em UTC, e meia-noite jogaria um
 * lançamento do dia 1º para o mês anterior em fusos negativos como o do Brasil.
 */
export function toAccrualDate({ day, month, year }: EntryDate): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`;
}

export function formatEntryDate(date: Date): MaskedDate {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

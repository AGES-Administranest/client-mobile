/** `YYYY-MM-DD` as the date fields show it, `dd/mm/aaaa`. */
export function toDayMonthYear(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

/** A complete, real `dd/mm/aaaa` as `YYYY-MM-DD`; anything else is null. */
export function toIsoDate(dayMonthYear: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dayMonthYear.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isReal =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);
  return isReal ? `${year}-${month}-${day}` : null;
}

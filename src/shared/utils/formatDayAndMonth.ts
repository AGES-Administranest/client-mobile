// pt-BR's short month format inserts "de" and a trailing period ("02 de
// out.") that reads oddly in a compact date chip; stripped here so every
// screen that shows a short day+month gets the same compact result.
export function formatDayAndMonth(date: Date, locale: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(date);

  return formatted.replace(' de ', ' ').replace(/\.$/, '');
}

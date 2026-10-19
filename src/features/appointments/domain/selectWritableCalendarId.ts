export type CalendarSummary = {
  id: string;
  allowsModifications: boolean;
  isPrimary?: boolean;
};

// Android não tem um calendário "padrão" único como o iOS (Calendar.getDefaultCalendarAsync
// só existe lá), então quem chama precisa escolher entre os calendários graváveis do
// aparelho. Isolado do SDK do expo-calendar para poder ser testado com dados simples.
export function selectWritableCalendarId(
  calendars: CalendarSummary[],
): string | null {
  const writable = calendars.filter(calendar => calendar.allowsModifications);
  if (writable.length === 0) {
    return null;
  }

  return (writable.find(calendar => calendar.isPrimary) ?? writable[0]).id;
}

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

// acquisitionDate chega como AAAA-MM-DD (ou ISO completo). Lemos ano e mês da
// string e formatamos em UTC: `new Date('2022-03-01')` é meia-noite UTC e, em
// fusos negativos, viraria fevereiro.
export function formatMonthYear(isoDate: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);

  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  // pt-BR devolve "mar. de 2022"; o card quer o compacto "Mar 2022".
  const compact = formatted.replace(' de ', ' ').replace('.', '');
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

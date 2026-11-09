import { toCalendarDate } from 'shared/utils/calendar';
import { formatCurrency } from 'shared/utils/currency';

export const HISTORY_PAGE_SIZE = 10;

export type HistoryPeriod = {
  from: string;
  to: string;
};

// Os números chegam opcionais porque um total sem linhas costuma vir null e um
// campo que faltar viraria NaN na tela; a conversão abaixo trata os dois.
export type ClientAppointmentResponse = {
  id: string;
  startsAt: string;
  procedureName: string | null;
  patientName: string | null;
  amount?: string | null;
};

export type ClientAppointment = Omit<ClientAppointmentResponse, 'amount'> & {
  amount: number | null;
};

export type ClientSummaryResponse = {
  appointmentsCount?: number | null;
  billedTotal?: string | null;
  tripCost?: string | null;
  tripCount?: number | null;
};

export type ClientSummary = {
  appointmentsCount: number;
  billedTotal: number;
  tripCost: number;
  tripCount: number;
};

export const EMPTY_CLIENT_SUMMARY: ClientSummary = {
  appointmentsCount: 0,
  billedTotal: 0,
  tripCost: 0,
  tripCount: 0,
};

export function monthPeriodOf(day: Date): HistoryPeriod {
  const year = day.getFullYear();
  const month = day.getMonth();

  return {
    from: toCalendarDate(new Date(year, month, 1)),
    to: toCalendarDate(new Date(year, month + 1, 0)),
  };
}

function parseApiDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toClientAppointment(
  response: ClientAppointmentResponse,
): ClientAppointment {
  return {
    ...response,
    amount: parseApiDecimal(response.amount),
  };
}

export function toClientSummary(
  response: ClientSummaryResponse,
): ClientSummary {
  return {
    appointmentsCount: response.appointmentsCount ?? 0,
    billedTotal: parseApiDecimal(response.billedTotal) ?? 0,
    tripCost: parseApiDecimal(response.tripCost) ?? 0,
    tripCount: response.tripCount ?? 0,
  };
}

export function toHistoryQuery(period: HistoryPeriod, page: number): string {
  return new URLSearchParams({
    from: period.from,
    to: period.to,
    page: String(page),
    limit: String(HISTORY_PAGE_SIZE),
  }).toString();
}

export function appendAppointments(
  known: ClientAppointment[],
  page: ClientAppointment[],
): ClientAppointment[] {
  const knownIds = new Set(known.map(appointment => appointment.id));

  return [
    ...known,
    ...page.filter(appointment => !knownIds.has(appointment.id)),
  ];
}

export function isLastHistoryPage(page: ClientAppointment[]): boolean {
  return page.length < HISTORY_PAGE_SIZE;
}

// O resumo conta os mesmos atendimentos concluídos do período que a lista
// devolve página por página; por isso a lista não precisa trazer o total.
export function remainingAppointments(
  summary: ClientSummary,
  loadedCount: number,
): number {
  return Math.max(summary.appointmentsCount - loadedCount, 0);
}

export function formatHistoryAmount(value: number, locale: string): string {
  return formatCurrency(value, locale, { showCents: !Number.isInteger(value) });
}

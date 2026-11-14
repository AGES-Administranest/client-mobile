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

export type ClientAppointmentListResponse = {
  items: ClientAppointmentResponse[];
  total?: number | null;
  page: number;
  limit: number;
};

export type ClientAppointmentPage = {
  appointments: ClientAppointment[];
  total: number;
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

export function toClientAppointmentPage(
  response: ClientAppointmentListResponse,
): ClientAppointmentPage {
  return {
    appointments: response.items.map(toClientAppointment),
    total: response.total ?? 0,
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

export function toPeriodQuery({ from, to }: HistoryPeriod): string {
  return new URLSearchParams({ from, to }).toString();
}

export function toHistoryQuery(period: HistoryPeriod, page: number): string {
  const paging = new URLSearchParams({
    page: String(page),
    limit: String(HISTORY_PAGE_SIZE),
  });
  return `${toPeriodQuery(period)}&${paging.toString()}`;
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

// Conta pelas páginas pedidas, não pelos itens na tela: um atendimento repetido
// entre páginas (concluído durante a rolagem) sai da lista, mas a página dele já
// foi entregue.
export function remainingAppointments(
  total: number,
  loadedPages: number,
): number {
  return Math.max(total - loadedPages * HISTORY_PAGE_SIZE, 0);
}

export function formatHistoryAmount(value: number, locale: string): string {
  return formatCurrency(value, locale, { showCents: !Number.isInteger(value) });
}

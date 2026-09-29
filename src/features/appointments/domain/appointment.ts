import { toCalendarDate } from 'shared/utils/calendar';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

export type Species = 'CANINE' | 'FELINE' | 'OTHER';

export type Appointment = {
  id: string;
  userId?: string;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  procedureName?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  amount?: number | string | null;
  patientName?: string | null;
  ownerName?: string | null;
  species?: Species | null;
  patientAgeYears?: number | null;
  weightKg?: number | string | null;
  asa?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAppointmentPayload = {
  procedureName?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  amount?: number;
  patientName?: string;
  ownerName?: string;
  species?: Species;
  patientAgeYears?: number;
  weightKg?: number;
  notes?: string;
  clientId?: string;
};

export function getAppointmentDateKey(startsAt: string): string {
  try {
    return toCalendarDate(startsAt);
  } catch {
    return startsAt.slice(0, 10);
  }
}

export function groupAppointmentsByDate(
  appointments: readonly Appointment[],
): Record<string, Appointment[]> {
  const grouped: Record<string, Appointment[]> = {};

  for (const appointment of appointments) {
    const key = getAppointmentDateKey(appointment.startsAt);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(appointment);
  }

  // Sort each day's appointments chronologically by startsAt
  for (const dateKey of Object.keys(grouped)) {
    grouped[dateKey].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  return grouped;
}

export function formatAppointmentTime(
  startsAt: string,
  endsAt?: string | null,
): string {
  try {
    const start = new Date(startsAt);
    const startFormatted = start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (endsAt) {
      const end = new Date(endsAt);
      const endFormatted = end.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${startFormatted} - ${endFormatted}`;
    }

    return startFormatted;
  } catch {
    return startsAt;
  }
}

export function isSameDay(dateA: string, dateB: string): boolean {
  return dateA === dateB;
}

export function formatAppointmentDateBadge(
  startsAt: string,
  locale = 'pt-BR',
): string {
  try {
    const date = new Date(startsAt);
    const day = date.getDate();
    const monthShort = new Intl.DateTimeFormat(locale, {
      month: 'short',
    })
      .format(date)
      .replace('.', '');
    return `${day} ${monthShort}`;
  } catch {
    return startsAt.slice(8, 10);
  }
}

// O que o card mostra no canto: o horário, e a data junto só quando a lista
// cobre o mês inteiro e o dia não é óbvio. "15:00 – 16:00" ou
// "30 set · 15:00 – 16:00".
export function formatAppointmentSchedule(
  startsAt: string,
  endsAt: string | null | undefined,
  options: { withDate: boolean; locale?: string },
): string {
  const locale = options.locale ?? 'pt-BR';
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const range = endsAt ? `${time(startsAt)} – ${time(endsAt)}` : time(startsAt);
  return options.withDate
    ? `${formatAppointmentDateBadge(startsAt, locale)} · ${range}`
    : range;
}

export function formatCurrency(amount?: number | string | null): string {
  if (amount == null || amount === '') return '';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return String(amount);

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// The form stores the bare class ("II"); older rows may carry "ASA II"
// already. Either way the badge reads "ASA II".
export function formatAsaLabel(asa: string): string {
  const value = asa
    .trim()
    .replace(/^asa\s*/i, '')
    .toUpperCase();
  return `ASA ${value}`;
}

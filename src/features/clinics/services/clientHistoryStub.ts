import { toCalendarDate } from 'shared/utils/calendar';

import {
  HISTORY_PAGE_SIZE,
  type ClientAppointmentResponse,
  type ClientSummaryResponse,
  type HistoryPeriod,
} from '../domain/clientHistory';

type StubAppointment = [
  monthsAgo: number,
  day: number,
  procedureName: string,
  patientName: string,
  amount: string,
];

const TRIP_COST_PER_APPOINTMENT = 16;
const STUB_DELAY_MS = 600;

// O mês atual tem os seis atendimentos do Figma (R$ 3.420 no total), mas cada
// um só aparece depois do seu dia, porque atendimento concluído não fica no
// futuro. O mês anterior tem mais de uma página, para o "Ver mais" aparecer.
const STUB_APPOINTMENTS: StubAppointment[] = [
  [0, 17, 'Orquiectomia', 'Mel', '620.00'],
  [0, 12, 'Ovariohisterectomia', 'Luna', '780.00'],
  [0, 8, 'Limpeza dentária', 'Thor', '450.00'],
  [0, 3, 'Exodontia', 'Nina', '390.00'],
  [0, 3, 'Mastectomia', 'Bela', '620.00'],
  [0, 3, 'Nodulectomia', 'Fred', '560.00'],
  [1, 28, 'Orquiectomia', 'Bob', '620.00'],
  [1, 26, 'Caudectomia', 'Max', '480.00'],
  [1, 24, 'Limpeza dentária', 'Lola', '450.00'],
  [1, 21, 'Ovariohisterectomia', 'Mia', '780.00'],
  [1, 19, 'Exodontia', 'Toby', '390.00'],
  [1, 17, 'Cistotomia', 'Pipoca', '950.00'],
  [1, 14, 'Orquiectomia', 'Zeus', '620.00'],
  [1, 12, 'Biópsia', 'Amora', '350.00'],
  [1, 10, 'Mastectomia', 'Nala', '620.00'],
  [1, 7, 'Limpeza dentária', 'Simba', '450.00'],
  [1, 5, 'Enucleação', 'Kiara', '880.00'],
  [1, 3, 'Orquiectomia', 'Rex', '620.00'],
  [1, 1, 'Exodontia', 'Lupi', '390.00'],
];

function toResponse(
  [monthsAgo, day, procedureName, patientName, amount]: StubAppointment,
  today: Date,
  index: number,
): ClientAppointmentResponse {
  const startsAt = new Date(
    today.getFullYear(),
    today.getMonth() - monthsAgo,
    day,
    13,
  );

  return {
    id: `stub-appointment-${index}`,
    startsAt: startsAt.toISOString(),
    procedureName,
    patientName,
    amount,
  };
}

function appointmentsWithin(
  period: HistoryPeriod,
): ClientAppointmentResponse[] {
  const today = new Date();
  const lastDay = [period.to, toCalendarDate(today)].sort()[0];

  return STUB_APPOINTMENTS.map((stub, index) => toResponse(stub, today, index))
    .filter(appointment => {
      const day = toCalendarDate(appointment.startsAt);
      return day >= period.from && day <= lastDay;
    })
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

function settle<T>(value: T): Promise<T> {
  return new Promise(resolve =>
    setTimeout(() => resolve(value), STUB_DELAY_MS),
  );
}

export function stubAppointmentsPage(
  period: HistoryPeriod,
  page: number,
): Promise<ClientAppointmentResponse[]> {
  const start = (page - 1) * HISTORY_PAGE_SIZE;

  return settle(
    appointmentsWithin(period).slice(start, start + HISTORY_PAGE_SIZE),
  );
}

export function stubSummary(
  period: HistoryPeriod,
): Promise<ClientSummaryResponse> {
  const appointments = appointmentsWithin(period);
  const billed = appointments.reduce(
    (total, appointment) => total + Number(appointment.amount),
    0,
  );

  return settle({
    appointmentsCount: appointments.length,
    billedTotal: billed.toFixed(2),
    tripCost: (appointments.length * TRIP_COST_PER_APPOINTMENT).toFixed(2),
    tripCount: appointments.length,
  });
}

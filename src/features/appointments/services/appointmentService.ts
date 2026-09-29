import { apiClient } from 'shared/services/apiClient';

import type { Appointment, AppointmentStatus } from '../domain/appointment';

export type FetchAppointmentsParams = {
  month: string; // YYYY-MM
  status?: AppointmentStatus;
};

// The API filters by `startsAt` within [from, to], not by month, so the month
// becomes its local-time bounds. 100 is the pageSize ceiling.
export async function fetchAppointments(
  idToken: string,
  params: FetchAppointmentsParams,
): Promise<Appointment[]> {
  const [year, month] = params.month.split('-').map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1, 0, 0, 0, -1);
  const query = new URLSearchParams({
    status: params.status ?? 'SCHEDULED',
    from: from.toISOString(),
    to: to.toISOString(),
    pageSize: '100',
  });

  return apiClient.get<Appointment[]>(`/appointments?${query.toString()}`, {
    token: idToken,
  });
}

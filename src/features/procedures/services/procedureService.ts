import { apiClient } from 'shared/services/apiClient';

import type {
  AppointmentResult,
  AppointmentsQuery,
  CreateAppointmentPayload,
} from '../domain/procedure.types';

export async function createAppointment(
  idToken: string,
  payload: CreateAppointmentPayload,
): Promise<AppointmentResult> {
  return apiClient.post<AppointmentResult>('/appointments', payload, {
    token: idToken,
  });
}

// O apiClient não monta query string, e o backend recusa parâmetro que não
// conhece (forbidNonWhitelisted): só entram os que têm valor.
function toQueryString(query: AppointmentsQuery): string {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params[key] = `${value}`;
    }
  }

  return new URLSearchParams(params).toString();
}

// Devolve um array puro, sem total nem indicação de próxima página, na ordem
// que o backend definir (hoje startsAt crescente).
export async function fetchAppointments(
  idToken: string,
  query: AppointmentsQuery,
): Promise<AppointmentResult[]> {
  return apiClient.get<AppointmentResult[]>(
    `/appointments?${toQueryString(query)}`,
    { token: idToken },
  );
}

export async function updateAppointment(
  idToken: string,
  id: string,
  payload: Partial<CreateAppointmentPayload>,
): Promise<AppointmentResult> {
  return apiClient.patch<AppointmentResult>(`/appointments/${id}`, payload, {
    token: idToken,
  });
}

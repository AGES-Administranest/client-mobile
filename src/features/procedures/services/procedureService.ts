import { ApiError, apiClient } from 'shared/services/apiClient';

import type { CreateAppointmentPayload } from '../domain/procedure.types';

export type AppointmentResult = {
  id: string;
  clientId: string | null;
  procedureName: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  amount: string | null;
  patientName: string | null;
  ownerName: string | null;
  species:
    | 'CANINE'
    | 'FELINE'
    | 'EQUINE'
    | 'BOVINE'
    | 'AVIAN'
    | 'EXOTIC'
    | 'OTHER'
    | null;
  patientAgeYears: number | null;
  weightKg: string | null;
  asa: string | null;
  notes: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type FinancialEntryResult = {
  id: string;
  nature: 'INCOME' | 'EXPENSE';
  scope: 'PROFESSIONAL' | 'PERSONAL';
  categoryId: string;
  description: string;
  amount: string;
  accrualDate: string;
  dueDate: string | null;
  settlementDate: string | null;
  status: 'PENDING' | 'SETTLED' | 'CANCELED';
  source:
    | 'APPOINTMENT'
    | 'SERVICE_INVOICE'
    | 'PURCHASE_INVOICE'
    | 'TRIP'
    | 'MANUAL';
  appointmentId: string | null;
  serviceInvoiceId: string | null;
  purchaseInvoiceId: string | null;
  tripId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// O agendamento já foi editado antes, pelo lápis; o valor só vai aqui quando
// a tela quiser completar e ajustar o valor no mesmo passo.
export type CompleteAppointmentPayload = { amount?: number };

export type CompletedAppointmentResult = AppointmentResult & {
  financialEntry: FinancialEntryResult;
};

// O `details` do 409 APPOINTMENT_TIME_CONFLICT: o agendamento que ocupa o
// horário (ConflictingAppointmentEntity do backend).
export type ConflictingAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  procedureName: string | null;
};

export function readTimeConflict(
  error: unknown,
): ConflictingAppointment | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== 'APPOINTMENT_TIME_CONFLICT'
  ) {
    return null;
  }
  const conflicting = error.details?.conflictingAppointment;
  return conflicting !== null && typeof conflicting === 'object'
    ? (conflicting as ConflictingAppointment)
    : null;
}

export async function createAppointment(
  idToken: string,
  payload: CreateAppointmentPayload,
): Promise<AppointmentResult> {
  return apiClient.post<AppointmentResult>('/appointments', payload, {
    token: idToken,
  });
}

// Converte um agendamento SCHEDULED em procedimento realizado e lança a
// receita no mesmo passo. Fica aqui até as branches da US07 trazerem o
// appointmentService, para onde deve migrar.
export async function completeAppointment(
  idToken: string,
  appointmentId: string,
  payload: CompleteAppointmentPayload,
): Promise<CompletedAppointmentResult> {
  return apiClient.patch<CompletedAppointmentResult>(
    `/appointments/${appointmentId}/complete`,
    payload,
    { token: idToken },
  );
}

// Marca um agendamento SCHEDULED como não realizado, sem lançar receita. O
// backend grava o motivo em `notes`. Mesmo destino do completeAppointment
// quando o appointmentService da US07 existir.
export async function cancelAppointment(
  idToken: string,
  appointmentId: string,
  reason: string,
): Promise<AppointmentResult> {
  return apiClient.patch<AppointmentResult>(
    `/appointments/${appointmentId}/cancel`,
    { reason },
    { token: idToken },
  );
}

// O backend filtra por um status por vez e pelo `startsAt` dentro de
// [from, to]; 100 é o teto do pageSize, folgado para um dia.
export async function fetchAppointments(
  idToken: string,
  query: { status: AppointmentResult['status']; from: string; to: string },
): Promise<AppointmentResult[]> {
  const params = new URLSearchParams({
    status: query.status,
    from: query.from,
    to: query.to,
    pageSize: '100',
  });
  return apiClient.get<AppointmentResult[]>(`/appointments?${params}`, {
    token: idToken,
  });
}

export async function fetchAppointment(
  idToken: string,
  appointmentId: string,
): Promise<AppointmentResult> {
  return apiClient.get<AppointmentResult>(`/appointments/${appointmentId}`, {
    token: idToken,
  });
}

export async function updateAppointmentAmount(
  idToken: string,
  appointmentId: string,
  amount: number,
): Promise<AppointmentResult> {
  return apiClient.patch<AppointmentResult>(
    `/appointments/${appointmentId}`,
    { amount },
    { token: idToken },
  );
}

// PATCH parcial: campo omitido não muda (não dá para limpar um campo por aqui).
export async function updateAppointment(
  idToken: string,
  appointmentId: string,
  payload: Partial<Omit<CreateAppointmentPayload, 'status'>>,
): Promise<AppointmentResult> {
  return apiClient.patch<AppointmentResult>(
    `/appointments/${appointmentId}`,
    payload,
    { token: idToken },
  );
}

export async function deleteAppointment(
  idToken: string,
  appointmentId: string,
): Promise<void> {
  await apiClient.delete<AppointmentResult>(`/appointments/${appointmentId}`, {
    token: idToken,
  });
}

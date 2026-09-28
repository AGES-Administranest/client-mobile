import { apiClient } from 'shared/services/apiClient';

import type { CreateAppointmentPayload } from '../domain/procedure.types';
import type { CompleteAppointmentPayload } from '../domain/toCompleteAppointmentPayload';

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
  species: 'CANINE' | 'FELINE' | 'OTHER' | null;
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

export type CompletedAppointmentResult = AppointmentResult & {
  financialEntry: FinancialEntryResult;
};

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

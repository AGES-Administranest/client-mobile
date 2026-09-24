import { apiClient } from 'shared/services/apiClient';

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

export async function createAppointment(
  idToken: string,
  payload: CreateAppointmentPayload,
): Promise<AppointmentResult> {
  return apiClient.post<AppointmentResult>('/appointments', payload, {
    token: idToken,
  });
}

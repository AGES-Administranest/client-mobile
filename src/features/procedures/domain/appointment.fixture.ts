import type { AppointmentResult } from './procedure.types';

export function buildAppointment(
  overrides: Partial<AppointmentResult> = {},
): AppointmentResult {
  return {
    id: 'appointment-1',
    clientId: 'client-1',
    procedureName: 'Orquiectomia',
    startsAt: new Date(2026, 7, 6, 9, 0).toISOString(),
    endsAt: new Date(2026, 7, 6, 10, 0).toISOString(),
    location: null,
    amount: '350.00',
    patientName: 'Rex',
    ownerName: null,
    species: 'CANINE',
    patientAgeYears: 3,
    weightKg: '12.500',
    asa: 'I',
    notes: null,
    status: 'COMPLETED',
    createdAt: '2026-08-06T12:00:00.000Z',
    updatedAt: '2026-08-06T12:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

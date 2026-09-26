import { ApiError } from 'shared/services/apiClient';

import type {
  Appointment,
  AppointmentPayload,
  ConflictingAppointment,
} from '../domain/appointment';

const TIME_CONFLICT = 'APPOINTMENT_TIME_CONFLICT';
const NOT_FOUND = 'APPOINTMENT_NOT_FOUND';

/**
 * O agendamento conflitante de um 409, ou null se o erro for outro.
 *
 * O contrato é o do módulo `appointments` do backend (branch
 * feat-us07-conflito-horario-agendamentos): código APPOINTMENT_TIME_CONFLICT e
 * `details: { conflict: true, conflictingAppointment }`.
 */
export function readTimeConflict(
  error: unknown,
): ConflictingAppointment | null {
  if (!(error instanceof ApiError) || error.code !== TIME_CONFLICT) {
    return null;
  }

  const conflicting = error.details?.conflictingAppointment;

  return conflicting && typeof conflicting === 'object'
    ? (conflicting as ConflictingAppointment)
    : null;
}

// ---------------------------------------------------------------------------
// Stand-in: o módulo de agendamentos ainda não está no `dev` do backend (vive
// no branch feat-us07-conflito-horario-agendamentos). As assinaturas já são as
// das chamadas reais — idToken primeiro, como em itemService, porque o dono
// vem do token e o payload nunca carrega userId — então ligar na API é trocar
// o corpo de cada função por:
//
//   create: apiClient.post<Appointment>('/appointments', payload, { token: idToken })
//   update: apiClient.patch<Appointment>(`/appointments/${id}`, payload, { token: idToken })
//
// Até lá os agendamentos ficam em memória e o conflito é detectado com a mesma
// regra do backend (intervalos que se sobrepõem, bordas encostadas não contam),
// respondendo o mesmo 409 — assim o alerta de conflito pode ser testado sem
// servidor.
// ---------------------------------------------------------------------------

const APPOINTMENTS: Appointment[] = [];

function overlaps(payload: AppointmentPayload, other: Appointment): boolean {
  return (
    other.endsAt !== null &&
    payload.startsAt < other.endsAt &&
    payload.endsAt > other.startsAt
  );
}

function assertNoConflict(
  payload: AppointmentPayload,
  excludeId: string | null,
) {
  const conflicting = APPOINTMENTS.find(
    other => other.id !== excludeId && overlaps(payload, other),
  );

  if (conflicting && conflicting.endsAt !== null) {
    throw new ApiError(
      'This time slot conflicts with another scheduled appointment',
      TIME_CONFLICT,
      409,
      {
        conflict: true,
        conflictingAppointment: {
          id: conflicting.id,
          startsAt: conflicting.startsAt,
          endsAt: conflicting.endsAt,
          procedureName: conflicting.procedureName,
        },
      },
    );
  }
}

function toAppointment(id: string, payload: AppointmentPayload): Appointment {
  return {
    id,
    ...payload,
    amount: payload.amount.toFixed(2),
    weightKg: payload.weightKg === null ? null : String(payload.weightKg),
  };
}

export async function createAppointment(
  idToken: string,
  payload: AppointmentPayload,
): Promise<Appointment> {
  assertNoConflict(payload, null);

  const created = toAppointment(`appointment-${Date.now()}`, payload);
  APPOINTMENTS.push(created);

  return Promise.resolve(created);
}

export async function updateAppointment(
  idToken: string,
  id: string,
  payload: AppointmentPayload,
): Promise<Appointment> {
  const index = APPOINTMENTS.findIndex(appointment => appointment.id === id);

  if (index === -1) {
    throw new ApiError('Appointment not found', NOT_FOUND, 404);
  }

  assertNoConflict(payload, id);

  const updated = toAppointment(id, payload);
  APPOINTMENTS[index] = updated;

  return Promise.resolve(updated);
}

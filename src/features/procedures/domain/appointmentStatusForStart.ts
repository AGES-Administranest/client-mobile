import type { AppointmentStatus } from './procedure.types';

// Um só formulário registra os dois casos: começo no futuro é agendamento
// (US07), começo já passado é procedimento realizado (US05).
export function appointmentStatusForStart(
  startsAt: Date,
  now: Date,
): Extract<AppointmentStatus, 'SCHEDULED' | 'COMPLETED'> {
  return startsAt.getTime() > now.getTime() ? 'SCHEDULED' : 'COMPLETED';
}

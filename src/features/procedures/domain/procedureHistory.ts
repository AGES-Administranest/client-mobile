import type {
  AppointmentResult,
  ProcedureHistoryItem,
} from './procedure.types';

export type ClientNames = ReadonlyMap<string, string>;

export function buildClientNames(
  clients: readonly { id: string; name: string }[],
): ClientNames {
  return new Map(clients.map(client => [client.id, client.name]));
}

export function resolveClientName(
  appointment: AppointmentResult,
  clientNames: ClientNames,
): string | null {
  const registered =
    appointment.clientId === null
      ? undefined
      : clientNames.get(appointment.clientId);
  if (registered) {
    return registered;
  }

  const legacyLocation = appointment.location?.trim();
  return legacyLocation ? legacyLocation : null;
}

export function toHistoryItems(
  appointments: readonly AppointmentResult[],
  clientNames: ClientNames,
): ProcedureHistoryItem[] {
  return appointments.map(appointment => ({
    appointment,
    clientName: resolveClientName(appointment, clientNames),
  }));
}

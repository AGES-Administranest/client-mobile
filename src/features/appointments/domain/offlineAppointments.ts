import { toCalendarDate } from 'shared/utils/calendar';

import type { Appointment, AppointmentStatus, Species } from './appointment';

/**
 * O corpo de um POST /appointments, como o formulário monta. `species` fica
 * string porque o formulário conhece mais espécies do que o tipo da agenda.
 */
export type OfflineAppointmentPayload = {
  startsAt: string;
  status: AppointmentStatus;
  endsAt?: string;
  patientName?: string;
  procedureName?: string;
  clientId?: string;
  species?: string;
  asa?: string;
  weightKg?: number;
  patientAgeYears?: number;
  amount?: number;
  notes?: string;
};

export type OfflineAppointmentChanges = Partial<
  Omit<OfflineAppointmentPayload, 'status'>
>;

export type PendingAppointmentOperation =
  | {
      kind: 'create';
      clientGeneratedId: string;
      payload: OfflineAppointmentPayload;
    }
  | {
      kind: 'update';
      appointmentId: string;
      changes: OfflineAppointmentChanges;
    };

export type SyncRejection = {
  operation: PendingAppointmentOperation;
  /** O `code` do backend (ADR-07), ou null se a resposta não trouxe um. */
  code: string | null;
};

const LOCAL_ID_PREFIX = 'local:';

// Enquanto não sincroniza, o agendamento criado offline não tem id do
// backend; o clientGeneratedId faz esse papel e vira o id na agenda.
export function localAppointmentId(clientGeneratedId: string): string {
  return `${LOCAL_ID_PREFIX}${clientGeneratedId}`;
}

export function isLocalAppointmentId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function clientGeneratedIdOf(localId: string): string {
  return localId.slice(LOCAL_ID_PREFIX.length);
}

// "2026-09" no fuso do aparelho, o mesmo recorte que a agenda usa.
export function appointmentMonth(startsAt: string): string {
  return toCalendarDate(startsAt).slice(0, 7);
}

export { isNetworkError } from 'shared/utils/network';

export function pendingCreateToAppointment(
  clientGeneratedId: string,
  payload: OfflineAppointmentPayload,
): Appointment {
  return {
    ...payload,
    id: localAppointmentId(clientGeneratedId),
    endsAt: payload.endsAt ?? null,
    amount: payload.amount ?? null,
    species: (payload.species as Species | undefined) ?? null,
    pendingSync: true,
  };
}

/**
 * Editar um agendamento que ainda nem foi criado no backend não gera uma
 * segunda operação: a edição entra no próprio create. Editar de novo algo já
 * pendente junta as mudanças na mesma operação, a mais recente vencendo.
 */
export function enqueueUpdate(
  queue: readonly PendingAppointmentOperation[],
  appointmentId: string,
  changes: OfflineAppointmentChanges,
): PendingAppointmentOperation[] {
  if (isLocalAppointmentId(appointmentId)) {
    const clientGeneratedId = clientGeneratedIdOf(appointmentId);
    return queue.map(operation =>
      operation.kind === 'create' &&
      operation.clientGeneratedId === clientGeneratedId
        ? { ...operation, payload: { ...operation.payload, ...changes } }
        : operation,
    );
  }

  const existing = queue.find(
    operation =>
      operation.kind === 'update' && operation.appointmentId === appointmentId,
  );
  if (!existing) {
    return [...queue, { kind: 'update', appointmentId, changes }];
  }
  return queue.map(operation =>
    operation === existing && operation.kind === 'update'
      ? { ...operation, changes: { ...operation.changes, ...changes } }
      : operation,
  );
}

/**
 * A agenda de um mês como o usuário a deixou: o que veio do backend (ou do
 * cache), com as edições pendentes aplicadas e os criados offline somados.
 */
export function applyPendingOperations(
  appointments: readonly Appointment[],
  queue: readonly PendingAppointmentOperation[],
  month: string,
): Appointment[] {
  const edited = appointments.map(appointment => {
    const update = queue.find(
      operation =>
        operation.kind === 'update' &&
        operation.appointmentId === appointment.id,
    );
    if (!update || update.kind !== 'update') {
      return appointment;
    }
    const { species, ...changes } = update.changes;
    return {
      ...appointment,
      ...changes,
      ...(species !== undefined ? { species: species as Species } : {}),
      pendingSync: true,
    };
  });

  // O que veio do backend já é do mês pedido; só os criados offline, que
  // podem ser de qualquer mês, precisam do recorte.
  const created = queue.flatMap(operation =>
    operation.kind === 'create' &&
    appointmentMonth(operation.payload.startsAt) === month
      ? [
          pendingCreateToAppointment(
            operation.clientGeneratedId,
            operation.payload,
          ),
        ]
      : [],
  );

  return [...edited, ...created];
}

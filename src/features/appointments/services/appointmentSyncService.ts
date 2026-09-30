import { resolveLocalClientId } from 'features/clients';
import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadOutbox,
  loadRejections,
  notifyOfflineAppointmentsChanged,
  saveOutbox,
  saveRejections,
  saveResolvedAppointmentId,
} from './offlineAppointmentStore';
import type {
  PendingAppointmentOperation,
  SyncRejection,
} from '../domain/offlineAppointments';

export type SyncResult = {
  synced: number;
  rejected: number;
  pending: number;
};

async function send(
  idToken: string,
  userId: string,
  operation: PendingAppointmentOperation,
  clientId: string | undefined,
): Promise<void> {
  if (operation.kind === 'create') {
    // O /sync é idempotente pelo clientGeneratedId: se a resposta de um envio
    // anterior se perdeu, reenviar atualiza o mesmo registro em vez de
    // duplicar. Um por vez, para um conflito não travar os outros.
    const [saved] = await apiClient.post<{ id: string }[]>(
      '/appointments/sync',
      [
        {
          ...operation.payload,
          ...(clientId !== undefined ? { clientId } : {}),
          clientGeneratedId: operation.clientGeneratedId,
        },
      ],
      { token: idToken },
    );
    if (saved) {
      await saveResolvedAppointmentId(
        userId,
        operation.clientGeneratedId,
        saved.id,
      );
    }
    return;
  }
  await apiClient.patch(
    `/appointments/${operation.appointmentId}`,
    {
      ...operation.changes,
      ...(clientId !== undefined ? { clientId } : {}),
    },
    { token: idToken },
  );
}

type ClientIdCheck =
  | { status: 'ready'; clientId: string | undefined }
  | { status: 'pending' }
  | { status: 'missing' };

// Um agendamento pode apontar para uma clínica cadastrada offline. Ele só
// sai depois dela (a fila de clínicas roda antes), com o id do backend no
// lugar do local; se a clínica foi recusada, ele não tem como ir.
async function checkClientId(
  userId: string,
  operation: PendingAppointmentOperation,
): Promise<ClientIdCheck> {
  const clientId =
    operation.kind === 'create'
      ? operation.payload.clientId
      : operation.changes.clientId;
  if (clientId === undefined) {
    return { status: 'ready', clientId: undefined };
  }
  const resolution = await resolveLocalClientId(userId, clientId);
  return resolution.status === 'resolved'
    ? { status: 'ready', clientId: resolution.clientId }
    : resolution;
}

// Só um 4xx de dado (conflito, validação, não encontrado) é definitivo. Sem
// rede, token vencido, limite de taxa ou erro do servidor: tenta de novo
// depois, com a fila intacta.
function isPermanentRejection(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

async function removeIfUnchanged(
  userId: string,
  sent: PendingAppointmentOperation,
): Promise<void> {
  const queue = await loadOutbox(userId);
  const sentJson = JSON.stringify(sent);
  // Editado enquanto era enviado: fica na fila e vai de novo com a edição.
  const index = queue.findIndex(
    operation => JSON.stringify(operation) === sentJson,
  );
  if (index !== -1) {
    await saveOutbox(userId, [
      ...queue.slice(0, index),
      ...queue.slice(index + 1),
    ]);
  }
}

async function run(idToken: string, userId: string): Promise<SyncResult> {
  let synced = 0;
  const rejections: SyncRejection[] = [];
  const attempted = new Set<string>();

  for (;;) {
    const queue = await loadOutbox(userId);
    const next = queue.find(
      operation => !attempted.has(JSON.stringify(operation)),
    );
    if (!next) break;
    attempted.add(JSON.stringify(next));

    const client = await checkClientId(userId, next);
    if (client.status === 'pending') {
      // Espera a clínica; as operações seguintes podem ir.
      continue;
    }
    if (client.status === 'missing') {
      rejections.push({ operation: next, code: 'CLIENT_NOT_SYNCED' });
      await removeIfUnchanged(userId, next);
      continue;
    }

    try {
      await send(idToken, userId, next, client.clientId);
      synced += 1;
    } catch (error) {
      if (!isPermanentRejection(error)) break;
      rejections.push({ operation: next, code: error.code });
    }
    await removeIfUnchanged(userId, next);
  }

  if (rejections.length > 0) {
    await saveRejections(userId, [
      ...(await loadRejections(userId)),
      ...rejections,
    ]);
  }
  if (synced > 0 || rejections.length > 0) {
    notifyOfflineAppointmentsChanged();
  }

  return {
    synced,
    rejected: rejections.length,
    pending: (await loadOutbox(userId)).length,
  };
}

let running: Promise<SyncResult> | null = null;

/** Envia a fila em ordem. Chamadas simultâneas esperam o mesmo envio. */
export function syncPendingAppointments(
  idToken: string,
  userId: string,
): Promise<SyncResult> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}

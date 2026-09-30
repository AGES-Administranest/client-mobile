import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadClientOutbox,
  loadClientRejections,
  notifyOfflineClientsChanged,
  saveClientOutbox,
  saveClientRejections,
  saveResolvedClientId,
} from './offlineClientStore';
import type { Client } from '../domain/client';
import { normalizeForSearch } from '../domain/clientSearch';
import type {
  ClientSyncRejection,
  PendingClientOperation,
} from '../domain/offlineClients';

export type ClinicSyncResult = {
  synced: number;
  rejected: number;
  pending: number;
};

// O POST /client não tem chave de idempotência. Se a resposta de um envio
// anterior se perdeu, o reenvio volta DUPLICATED_CLIENT_NAME: aí a clínica já
// existe com esse nome e é ela que vale para o id local.
async function createClinic(
  idToken: string,
  operation: Extract<PendingClientOperation, { kind: 'create' }>,
): Promise<string> {
  try {
    const created = await apiClient.post<Client>('/client', operation.payload, {
      token: idToken,
    });
    return created.id;
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.code !== 'DUPLICATED_CLIENT_NAME'
    ) {
      throw error;
    }
    const existing = (
      await apiClient.get<Client[]>('/client?type=CLINIC', { token: idToken })
    ).find(
      client =>
        normalizeForSearch(client.name) ===
        normalizeForSearch(operation.payload.name),
    );
    if (!existing) throw error;
    return existing.id;
  }
}

async function send(
  idToken: string,
  userId: string,
  operation: PendingClientOperation,
): Promise<void> {
  if (operation.kind === 'create') {
    const clientId = await createClinic(idToken, operation);
    await saveResolvedClientId(userId, operation.localId, clientId);
    return;
  }
  await apiClient.patch(`/client/${operation.clientId}`, operation.changes, {
    token: idToken,
  });
}

// Mesma regra da fila de agendamentos: só um 4xx de dado é definitivo.
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
  sent: PendingClientOperation,
): Promise<void> {
  const queue = await loadClientOutbox(userId);
  const sentJson = JSON.stringify(sent);
  const index = queue.findIndex(
    operation => JSON.stringify(operation) === sentJson,
  );
  if (index !== -1) {
    await saveClientOutbox(userId, [
      ...queue.slice(0, index),
      ...queue.slice(index + 1),
    ]);
  }
}

async function run(idToken: string, userId: string): Promise<ClinicSyncResult> {
  let synced = 0;
  const rejections: ClientSyncRejection[] = [];
  const attempted = new Set<string>();

  for (;;) {
    const queue = await loadClientOutbox(userId);
    const next = queue.find(
      operation => !attempted.has(JSON.stringify(operation)),
    );
    if (!next) break;
    attempted.add(JSON.stringify(next));

    try {
      await send(idToken, userId, next);
      synced += 1;
    } catch (error) {
      if (!isPermanentRejection(error)) break;
      rejections.push({ operation: next, code: error.code });
    }
    await removeIfUnchanged(userId, next);
  }

  if (rejections.length > 0) {
    await saveClientRejections(userId, [
      ...(await loadClientRejections(userId)),
      ...rejections,
    ]);
  }
  if (synced > 0 || rejections.length > 0) {
    notifyOfflineClientsChanged();
  }

  return {
    synced,
    rejected: rejections.length,
    pending: (await loadClientOutbox(userId)).length,
  };
}

let running: Promise<ClinicSyncResult> | null = null;

/**
 * Envia as clínicas da fila em ordem. Roda antes da fila de agendamentos,
 * que pode apontar para uma clínica criada offline.
 */
export function syncPendingClinics(
  idToken: string,
  userId: string,
): Promise<ClinicSyncResult> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}

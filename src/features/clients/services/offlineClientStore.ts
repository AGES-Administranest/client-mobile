import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { isNetworkError } from 'shared/utils/network';

import type { Client } from '../domain/client';
import {
  applyPendingClientOperations,
  enqueueClientUpdate,
  findDuplicates,
  isLocalClientId,
  localClientId,
  pendingCreateToClient,
  type ClientSyncRejection,
  type LocalClientResolution,
  type OfflineDuplicates,
  type OfflineClientChanges,
  type OfflineClientPayload,
  type PendingClientOperation,
} from '../domain/offlineClients';

// Por usuário, como a agenda offline: quem entra depois no mesmo aparelho
// não vê as clínicas nem a fila de quem saiu.
const PREFIX = '@administranest:clients';
const listKey = (userId: string) => `${PREFIX}:${userId}:clinics`;
const outboxKey = (userId: string) => `${PREFIX}:${userId}:outbox`;
const rejectionsKey = (userId: string) => `${PREFIX}:${userId}:rejections`;
const resolvedKey = (userId: string) => `${PREFIX}:${userId}:resolved`;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa quem mostra clínicas de que a fila ou a lista salva mudaram. */
export function subscribeOfflineClients(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineClientsChanged(): void {
  listeners.forEach(listener => listener());
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadClientOutbox(
  userId: string,
): Promise<PendingClientOperation[]> {
  return readJson<PendingClientOperation[]>(outboxKey(userId), []);
}

export async function saveClientOutbox(
  userId: string,
  queue: PendingClientOperation[],
): Promise<void> {
  await writeJson(outboxKey(userId), queue);
}

export function loadClientRejections(
  userId: string,
): Promise<ClientSyncRejection[]> {
  return readJson<ClientSyncRejection[]>(rejectionsKey(userId), []);
}

export async function saveClientRejections(
  userId: string,
  rejections: ClientSyncRejection[],
): Promise<void> {
  await writeJson(rejectionsKey(userId), rejections);
}

/** Id local → id do backend, das clínicas criadas offline já sincronizadas. */
export function loadResolvedClientIds(
  userId: string,
): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(resolvedKey(userId), {});
}

export async function saveResolvedClientId(
  userId: string,
  localId: string,
  clientId: string,
): Promise<void> {
  const resolved = await loadResolvedClientIds(userId);
  await writeJson(resolvedKey(userId), { ...resolved, [localId]: clientId });
}

async function loadClientCache(userId: string): Promise<Client[] | null> {
  return readJson<Client[] | null>(listKey(userId), null);
}

async function saveClientCache(
  userId: string,
  clients: Client[],
): Promise<void> {
  try {
    await writeJson(listKey(userId), clients);
  } catch {
    // Sem cache a lista só não abre offline; online continua igual.
  }
}

export type LoadedClients = { clients: Client[]; isOffline: boolean };

/**
 * Com rede, a lista vem do backend e fica salva; sem rede, vem do que foi
 * salvo da última vez. Nos dois casos as clínicas cadastradas ou editadas
 * offline entram por cima. Cada tela passa a própria busca (`fetcher`).
 */
export async function loadClientsWithOffline(
  userId: string | null,
  fetcher: () => Promise<Client[]>,
): Promise<LoadedClients> {
  let clients: Client[];
  let isOffline = false;
  try {
    clients = await fetcher();
    if (userId) await saveClientCache(userId, clients);
  } catch (error) {
    if (!userId || !isNetworkError(error)) throw error;
    const cached = await loadClientCache(userId);
    const queue = await loadClientOutbox(userId);
    if (cached === null && queue.length === 0) throw error;
    clients = cached ?? [];
    isOffline = true;
  }
  const queue = userId ? await loadClientOutbox(userId) : [];
  return { clients: applyPendingClientOperations(clients, queue), isOffline };
}

async function offlineClients(userId: string): Promise<Client[]> {
  return applyPendingClientOperations(
    (await loadClientCache(userId)) ?? [],
    await loadClientOutbox(userId),
  );
}

/**
 * Nome e CNPJ são únicos no backend; sem rede, a mesma checagem roda contra a
 * lista salva e a fila, para não aceitar agora o que seria recusado no envio.
 */
export async function findOfflineDuplicates(
  userId: string,
  candidate: { name?: string; taxId?: string },
  exceptId?: string,
): Promise<OfflineDuplicates> {
  return findDuplicates(await offlineClients(userId), candidate, exceptId);
}

export async function queueClinicCreate(
  userId: string,
  payload: OfflineClientPayload,
): Promise<Client> {
  const localId = localClientId(Crypto.randomUUID());
  const queue = await loadClientOutbox(userId);
  await saveClientOutbox(userId, [
    ...queue,
    { kind: 'create', localId, payload },
  ]);
  notifyOfflineClientsChanged();
  return pendingCreateToClient(localId, payload);
}

export async function queueClinicUpdate(
  userId: string,
  clientId: string,
  changes: OfflineClientChanges,
): Promise<Client | null> {
  // A tela pode ainda mostrar o id local de uma clínica que já sincronizou;
  // a edição vai para o id real, senão cairia num create que não existe mais.
  const resolved = isLocalClientId(clientId)
    ? (await loadResolvedClientIds(userId))[clientId]
    : undefined;
  const targetId = resolved ?? clientId;
  const queue = await loadClientOutbox(userId);
  await saveClientOutbox(userId, enqueueClientUpdate(queue, targetId, changes));
  notifyOfflineClientsChanged();
  return (
    (await offlineClients(userId)).find(client => client.id === targetId) ??
    null
  );
}

/**
 * Para o envio de um agendamento que aponta para uma clínica criada offline:
 * o id real se ela já sincronizou, `pending` se ainda está na fila, `missing`
 * se o backend a recusou (o agendamento não tem como ir).
 */
export async function resolveLocalClientId(
  userId: string,
  clientId: string,
): Promise<LocalClientResolution> {
  if (!isLocalClientId(clientId)) {
    return { status: 'resolved', clientId };
  }
  const resolved = (await loadResolvedClientIds(userId))[clientId];
  if (resolved) {
    return { status: 'resolved', clientId: resolved };
  }
  const queue = await loadClientOutbox(userId);
  return queue.some(
    operation => operation.kind === 'create' && operation.localId === clientId,
  )
    ? { status: 'pending' }
    : { status: 'missing' };
}

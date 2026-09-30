import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { Appointment } from '../domain/appointment';
import {
  appointmentMonth,
  applyPendingOperations,
  clientGeneratedIdOf,
  enqueueUpdate,
  isLocalAppointmentId,
  pendingCreateToAppointment,
  type OfflineAppointmentChanges,
  type OfflineAppointmentPayload,
  type PendingAppointmentOperation,
  type SyncRejection,
} from '../domain/offlineAppointments';

// Tudo por usuário: quem entra depois no mesmo aparelho não vê a agenda nem
// a fila de quem saiu.
const PREFIX = '@administranest:appointments';
const monthKey = (userId: string, month: string) =>
  `${PREFIX}:${userId}:month:${month}`;
const outboxKey = (userId: string) => `${PREFIX}:${userId}:outbox`;
const rejectionsKey = (userId: string) => `${PREFIX}:${userId}:rejections`;
const resolvedKey = (userId: string) => `${PREFIX}:${userId}:resolved`;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa quem mostra a agenda de que a fila ou o cache mudaram. */
export function subscribeOfflineAppointments(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineAppointmentsChanged(): void {
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

export function newClientGeneratedId(): string {
  return Crypto.randomUUID();
}

export async function saveMonthCache(
  userId: string,
  month: string,
  appointments: Appointment[],
): Promise<void> {
  try {
    await writeJson(monthKey(userId, month), appointments);
  } catch {
    // Sem cache a agenda só não abre offline; online continua igual.
  }
}

/** null quando o mês nunca foi aberto com conexão neste aparelho. */
export function loadMonthCache(
  userId: string,
  month: string,
): Promise<Appointment[] | null> {
  return readJson<Appointment[] | null>(monthKey(userId, month), null);
}

export async function findCachedAppointment(
  userId: string,
  appointmentId: string,
): Promise<Appointment | null> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const months = keys.filter(key =>
      key.startsWith(`${PREFIX}:${userId}:month:`),
    );
    for (const key of months) {
      const list = await readJson<Appointment[]>(key, []);
      const found = list.find(appointment => appointment.id === appointmentId);
      if (found) return found;
    }
  } catch {
    // cai no null
  }
  return null;
}

export function loadOutbox(
  userId: string,
): Promise<PendingAppointmentOperation[]> {
  return readJson<PendingAppointmentOperation[]>(outboxKey(userId), []);
}

export async function saveOutbox(
  userId: string,
  queue: PendingAppointmentOperation[],
): Promise<void> {
  await writeJson(outboxKey(userId), queue);
}

export async function queueAppointmentCreate(
  userId: string,
  clientGeneratedId: string,
  payload: OfflineAppointmentPayload,
): Promise<void> {
  const queue = await loadOutbox(userId);
  await saveOutbox(userId, [
    ...queue,
    { kind: 'create', clientGeneratedId, payload },
  ]);
  notifyOfflineAppointmentsChanged();
}

/** clientGeneratedId → id do backend, dos agendamentos já sincronizados. */
function loadResolvedAppointmentIds(
  userId: string,
): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(resolvedKey(userId), {});
}

export async function saveResolvedAppointmentId(
  userId: string,
  clientGeneratedId: string,
  appointmentId: string,
): Promise<void> {
  const resolved = await loadResolvedAppointmentIds(userId);
  await writeJson(resolvedKey(userId), {
    ...resolved,
    [clientGeneratedId]: appointmentId,
  });
}

/**
 * O id do backend de um agendamento criado offline que já sincronizou, ou
 * null se ele ainda está na fila (ou se o id já é do backend).
 */
export async function resolveLocalAppointmentId(
  userId: string,
  appointmentId: string,
): Promise<string | null> {
  if (!isLocalAppointmentId(appointmentId)) return null;
  const resolved = await loadResolvedAppointmentIds(userId);
  return resolved[clientGeneratedIdOf(appointmentId)] ?? null;
}

export async function queueAppointmentUpdate(
  userId: string,
  appointmentId: string,
  changes: OfflineAppointmentChanges,
): Promise<void> {
  // A tela pode ainda mostrar o id local de um agendamento que já
  // sincronizou; a edição vai para o id real, senão cairia num create que
  // não está mais na fila.
  const resolved = isLocalAppointmentId(appointmentId)
    ? (await loadResolvedAppointmentIds(userId))[
        clientGeneratedIdOf(appointmentId)
      ]
    : undefined;
  const queue = await loadOutbox(userId);
  await saveOutbox(
    userId,
    enqueueUpdate(queue, resolved ?? appointmentId, changes),
  );
  notifyOfflineAppointmentsChanged();
}

export function loadRejections(userId: string): Promise<SyncRejection[]> {
  return readJson<SyncRejection[]>(rejectionsKey(userId), []);
}

export async function saveRejections(
  userId: string,
  rejections: SyncRejection[],
): Promise<void> {
  await writeJson(rejectionsKey(userId), rejections);
}

/**
 * O agendamento como o usuário o deixou, sem rede: criado offline (ainda na
 * fila) ou salvo no cache de algum mês, com as edições pendentes aplicadas.
 */
export async function findOfflineAppointment(
  userId: string,
  appointmentId: string,
): Promise<Appointment | null> {
  const queue = await loadOutbox(userId);
  if (isLocalAppointmentId(appointmentId)) {
    const clientGeneratedId = clientGeneratedIdOf(appointmentId);
    const create = queue.find(
      operation =>
        operation.kind === 'create' &&
        operation.clientGeneratedId === clientGeneratedId,
    );
    return create && create.kind === 'create'
      ? pendingCreateToAppointment(create.clientGeneratedId, create.payload)
      : null;
  }
  const cached = await findCachedAppointment(userId, appointmentId);
  if (!cached) return null;
  const [withEdits] = applyPendingOperations(
    [cached],
    queue.filter(operation => operation.kind === 'update'),
    appointmentMonth(cached.startsAt),
  );
  return withEdits ?? cached;
}

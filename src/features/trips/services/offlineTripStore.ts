import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  applyPendingTripOperations,
  clientGeneratedIdOfTrip,
  enqueueTripDelete,
  enqueueTripUpdate,
  isLocalTripId,
  pendingCreateToTrip,
  type OfflineTripChanges,
  type OfflineTripPayload,
  type PendingTripOperation,
  type TripSyncRejection,
} from '../domain/offlineTrips';
import type { Trip } from '../domain/trip.types';

export { pendingCreateToTrip };

const PREFIX = '@administranest:trips';
const cacheKey = (userId: string) => `${PREFIX}:${userId}:cache`;
const outboxKey = (userId: string) => `${PREFIX}:${userId}:outbox`;
const rejectionsKey = (userId: string) => `${PREFIX}:${userId}:rejections`;
const resolvedKey = (userId: string) => `${PREFIX}:${userId}:resolved`;

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeOfflineTrips(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineTripsChanged(): void {
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

export function newTripClientGeneratedId(): string {
  return Crypto.randomUUID();
}

export function loadTripCache(userId: string): Promise<Trip[]> {
  return readJson<Trip[]>(cacheKey(userId), []);
}

export async function saveTripCache(
  userId: string,
  trips: Trip[],
): Promise<void> {
  try {
    await writeJson(cacheKey(userId), trips);
  } catch {
    // Cache write error ignored
  }
}

export function loadTripOutbox(
  userId: string,
): Promise<PendingTripOperation[]> {
  return readJson<PendingTripOperation[]>(outboxKey(userId), []);
}

export async function saveTripOutbox(
  userId: string,
  queue: PendingTripOperation[],
): Promise<void> {
  await writeJson(outboxKey(userId), queue);
}

export async function queueTripCreate(
  userId: string,
  clientGeneratedId: string,
  payload: OfflineTripPayload,
  calculatedCost: number,
): Promise<void> {
  const queue = await loadTripOutbox(userId);
  await saveTripOutbox(userId, [
    ...queue,
    { kind: 'create', clientGeneratedId, payload, calculatedCost },
  ]);
  notifyOfflineTripsChanged();
}

function loadResolvedTripIds(
  userId: string,
): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(resolvedKey(userId), {});
}

export async function saveResolvedTripId(
  userId: string,
  clientGeneratedId: string,
  tripId: string,
): Promise<void> {
  const resolved = await loadResolvedTripIds(userId);
  await writeJson(resolvedKey(userId), {
    ...resolved,
    [clientGeneratedId]: tripId,
  });
}

export async function resolveLocalTripId(
  userId: string,
  tripId: string,
): Promise<string | null> {
  if (!isLocalTripId(tripId)) return null;
  const resolved = await loadResolvedTripIds(userId);
  return resolved[clientGeneratedIdOfTrip(tripId)] ?? null;
}

export async function queueTripUpdate(
  userId: string,
  tripId: string,
  changes: OfflineTripChanges,
  calculatedCost?: number,
): Promise<void> {
  const resolved = isLocalTripId(tripId)
    ? (await loadResolvedTripIds(userId))[clientGeneratedIdOfTrip(tripId)]
    : undefined;
  const targetId = resolved ?? tripId;
  const queue = await loadTripOutbox(userId);
  await saveTripOutbox(
    userId,
    enqueueTripUpdate(queue, targetId, changes, calculatedCost),
  );
  notifyOfflineTripsChanged();
}

export async function queueTripDelete(
  userId: string,
  tripId: string,
): Promise<void> {
  const resolved = isLocalTripId(tripId)
    ? (await loadResolvedTripIds(userId))[clientGeneratedIdOfTrip(tripId)]
    : undefined;
  const targetId = resolved ?? tripId;
  const queue = await loadTripOutbox(userId);
  await saveTripOutbox(userId, enqueueTripDelete(queue, targetId));
  notifyOfflineTripsChanged();
}

export function loadTripRejections(
  userId: string,
): Promise<TripSyncRejection[]> {
  return readJson<TripSyncRejection[]>(rejectionsKey(userId), []);
}

export async function saveTripRejections(
  userId: string,
  rejections: TripSyncRejection[],
): Promise<void> {
  await writeJson(rejectionsKey(userId), rejections);
}

export async function findOfflineTrip(
  userId: string,
  tripId: string,
): Promise<Trip | null> {
  const queue = await loadTripOutbox(userId);
  if (isLocalTripId(tripId)) {
    const clientGeneratedId = clientGeneratedIdOfTrip(tripId);
    const create = queue.find(
      op =>
        op.kind === 'create' &&
        op.clientGeneratedId === clientGeneratedId,
    );
    return create && create.kind === 'create'
      ? pendingCreateToTrip(
          create.clientGeneratedId,
          create.payload,
          create.calculatedCost,
        )
      : null;
  }

  const cached = await loadTripCache(userId);
  const found = cached.find(t => t.id === tripId);
  if (!found) return null;
  const [withEdits] = applyPendingTripOperations([found], queue);
  return withEdits ?? null;
}

export async function loadTripsWithOffline(
  userId: string,
  cachedTrips: Trip[],
): Promise<Trip[]> {
  const queue = await loadTripOutbox(userId);
  return applyPendingTripOperations(cachedTrips, queue);
}

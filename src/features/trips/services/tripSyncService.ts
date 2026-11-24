import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadTripOutbox,
  loadTripRejections,
  notifyOfflineTripsChanged,
  saveResolvedTripId,
  saveTripOutbox,
  saveTripRejections,
} from './offlineTripStore';
import type {
  PendingTripOperation,
  TripSyncRejection,
} from '../domain/offlineTrips';
import type { Trip } from '../domain/trip.types';

type PendingTripCreate = Extract<PendingTripOperation, { kind: 'create' }>;

export type TripSyncResult = {
  synced: number;
  rejected: number;
  pending: number;
};

function isPermanentRejection(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

async function sendCreate(
  idToken: string,
  userId: string,
  operation: PendingTripCreate,
): Promise<string> {
  const saved = await apiClient.post<Trip>(
    '/trips',
    {
      ...operation.payload,
      id: operation.clientGeneratedId,
    },
    { token: idToken },
  );
  const tripId = saved?.id ?? operation.clientGeneratedId;
  await saveResolvedTripId(userId, operation.clientGeneratedId, tripId);
  return tripId;
}

async function removeIfUnchanged(
  userId: string,
  sent: PendingTripOperation,
): Promise<boolean> {
  const queue = await loadTripOutbox(userId);
  const sentJson = JSON.stringify(sent);
  const index = queue.findIndex(
    operation => JSON.stringify(operation) === sentJson,
  );
  if (index === -1) return false;
  await saveTripOutbox(userId, [
    ...queue.slice(0, index),
    ...queue.slice(index + 1),
  ]);
  return true;
}

// Edited while it was being created: the backend refuses the same id with
// other data, so what is left to send is an update of the trip just created.
async function turnEditedCreateIntoUpdate(
  userId: string,
  sent: PendingTripCreate,
  tripId: string,
): Promise<void> {
  const queue = await loadTripOutbox(userId);
  await saveTripOutbox(
    userId,
    queue.map(operation =>
      operation.kind === 'create' &&
      operation.clientGeneratedId === sent.clientGeneratedId
        ? {
            kind: 'update',
            tripId,
            changes: operation.payload,
            calculatedCost: operation.calculatedCost,
          }
        : operation,
    ),
  );
}

async function sendOperation(
  idToken: string,
  userId: string,
  operation: PendingTripOperation,
): Promise<void> {
  if (operation.kind === 'create') {
    const tripId = await sendCreate(idToken, userId, operation);
    if (!(await removeIfUnchanged(userId, operation))) {
      await turnEditedCreateIntoUpdate(userId, operation, tripId);
    }
    return;
  }

  if (operation.kind === 'update') {
    await apiClient.patch<Trip>(
      `/trips/${operation.tripId}`,
      operation.changes,
      { token: idToken },
    );
  } else {
    await apiClient.delete<Trip>(`/trips/${operation.tripId}`, {
      token: idToken,
    });
  }
  await removeIfUnchanged(userId, operation);
}

async function run(idToken: string, userId: string): Promise<TripSyncResult> {
  let synced = 0;
  const newRejections: TripSyncRejection[] = [];
  const attempted = new Set<string>();

  // The queue is read again for each operation: trips registered or edited
  // while another one is being sent must not be overwritten.
  for (;;) {
    const queue = await loadTripOutbox(userId);
    const next = queue.find(
      operation => !attempted.has(JSON.stringify(operation)),
    );
    if (!next) break;
    attempted.add(JSON.stringify(next));

    try {
      await sendOperation(idToken, userId, next);
      synced++;
    } catch (err) {
      // A refused operation edited meanwhile stays queued with its edit.
      if (
        isPermanentRejection(err) &&
        (await removeIfUnchanged(userId, next))
      ) {
        newRejections.push({ operation: next, code: err.code });
      }
    }
  }

  if (newRejections.length > 0) {
    await saveTripRejections(userId, [
      ...(await loadTripRejections(userId)),
      ...newRejections,
    ]);
  }
  if (synced > 0 || newRejections.length > 0) {
    notifyOfflineTripsChanged();
  }

  return {
    synced,
    rejected: newRejections.length,
    pending: (await loadTripOutbox(userId)).length,
  };
}

let running: Promise<TripSyncResult> | null = null;

/** Sends the queue in order. Simultaneous calls wait for the same run. */
export function syncPendingTrips(
  idToken: string,
  userId: string,
): Promise<TripSyncResult> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}

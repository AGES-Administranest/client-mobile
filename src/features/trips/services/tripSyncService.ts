import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadTripOutbox,
  loadTripRejections,
  notifyOfflineTripsChanged,
  saveResolvedTripId,
  saveTripOutbox,
  saveTripRejections,
} from './offlineTripStore';
import type { PendingTripOperation, TripSyncRejection } from '../domain/offlineTrips';
import type { Trip } from '../domain/trip.types';

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

async function sendIndividualOperation(
  idToken: string,
  userId: string,
  operation: PendingTripOperation,
): Promise<Trip | null> {
  if (operation.kind === 'create') {
    const saved = await apiClient.post<Trip>(
      '/trips',
      {
        ...operation.payload,
        id: operation.clientGeneratedId,
      },
      { token: idToken },
    );
    if (saved?.id) {
      await saveResolvedTripId(userId, operation.clientGeneratedId, saved.id);
    }
    return saved;
  }

  if (operation.kind === 'update') {
    return apiClient.patch<Trip>(
      `/trips/${operation.tripId}`,
      operation.changes,
      { token: idToken },
    );
  }

  if (operation.kind === 'delete') {
    return apiClient.delete<Trip>(`/trips/${operation.tripId}`, {
      token: idToken,
    });
  }

  return null;
}

export async function syncPendingTrips(
  idToken: string,
  userId: string,
): Promise<TripSyncResult> {
  const queue = await loadTripOutbox(userId);
  if (queue.length === 0) {
    return { synced: 0, rejected: 0, pending: 0 };
  }

  let synced = 0;
  const remaining: PendingTripOperation[] = [];
  const rejections = await loadTripRejections(userId);
  const newRejections: TripSyncRejection[] = [];

  // Try batch endpoint POST /trips/sync first as required by US14 contract
  let batchSyncSuccessful = false;
  try {
    const creates = queue.filter(op => op.kind === 'create');
    if (creates.length === queue.length && creates.length > 0) {
      // Contract batch format
      const batchPayload = creates.map(op => ({
        ...op.payload,
        id: op.clientGeneratedId,
      }));
      const results = await apiClient.post<Trip[]>(
        '/trips/sync',
        batchPayload,
        { token: idToken },
      );
      if (Array.isArray(results)) {
        for (let i = 0; i < creates.length; i++) {
          const item = results[i];
          if (item?.id) {
            await saveResolvedTripId(
              userId,
              creates[i].clientGeneratedId,
              item.id,
            );
          }
        }
        synced = creates.length;
        batchSyncSuccessful = true;
        await saveTripOutbox(userId, []);
        notifyOfflineTripsChanged();
        return { synced, rejected: 0, pending: 0 };
      }
    }
  } catch (err) {
    // If /trips/sync is not available (404/500/etc), proceed with individual operations
    if (isPermanentRejection(err)) {
      // Keep going to individual fallback or reject
    }
  }

  if (!batchSyncSuccessful) {
    for (const operation of queue) {
      try {
        await sendIndividualOperation(idToken, userId, operation);
        synced++;
      } catch (err) {
        if (isPermanentRejection(err)) {
          newRejections.push({
            operation,
            code: err instanceof ApiError ? err.code : null,
          });
        } else {
          // Network error or server transient error: keep in outbox
          remaining.push(operation);
        }
      }
    }

    await saveTripOutbox(userId, remaining);
    if (newRejections.length > 0) {
      await saveTripRejections(userId, [...rejections, ...newRejections]);
    }
    notifyOfflineTripsChanged();
  }

  return {
    synced,
    rejected: newRejections.length,
    pending: remaining.length,
  };
}

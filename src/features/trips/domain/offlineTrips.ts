import type { CreateTripDto, Trip, UpdateTripDto } from './trip.types';

export type OfflineTripPayload = CreateTripDto;
export type OfflineTripChanges = UpdateTripDto;

export type PendingTripOperation =
  | {
      kind: 'create';
      clientGeneratedId: string;
      payload: OfflineTripPayload;
      calculatedCost: number;
    }
  | {
      kind: 'update';
      tripId: string;
      changes: OfflineTripChanges;
      calculatedCost?: number;
    }
  | {
      kind: 'delete';
      tripId: string;
    };

export type TripSyncRejection = {
  operation: PendingTripOperation;
  code: string | null;
};

const LOCAL_TRIP_PREFIX = 'local:trip:';

export function localTripId(clientGeneratedId: string): string {
  return `${LOCAL_TRIP_PREFIX}${clientGeneratedId}`;
}

export function isLocalTripId(id: string): boolean {
  return id.startsWith(LOCAL_TRIP_PREFIX);
}

export function clientGeneratedIdOfTrip(localId: string): string {
  return localId.slice(LOCAL_TRIP_PREFIX.length);
}

export function pendingCreateToTrip(
  clientGeneratedId: string,
  payload: OfflineTripPayload,
  calculatedCost: number,
): Trip {
  return {
    id: localTripId(clientGeneratedId),
    mode: payload.mode,
    vehicleId: payload.vehicleId ?? null,
    appointmentId: payload.appointmentId ?? null,
    clientId: payload.clientId ?? null,
    occurredOn: payload.occurredOn,
    origin: payload.origin,
    destination: payload.destination,
    distanceKm: payload.distanceKm != null ? String(payload.distanceKm) : null,
    cost: String(calculatedCost),
    pendingSync: true,
  };
}

export function enqueueTripUpdate(
  queue: readonly PendingTripOperation[],
  tripId: string,
  changes: OfflineTripChanges,
  calculatedCost?: number,
): PendingTripOperation[] {
  if (isLocalTripId(tripId)) {
    const clientGeneratedId = clientGeneratedIdOfTrip(tripId);
    return queue.map(operation => {
      if (
        operation.kind === 'create' &&
        operation.clientGeneratedId === clientGeneratedId
      ) {
        return {
          ...operation,
          payload: { ...operation.payload, ...changes },
          calculatedCost: calculatedCost ?? operation.calculatedCost,
        };
      }
      return operation;
    });
  }

  const existingIndex = queue.findIndex(
    op => op.kind === 'update' && op.tripId === tripId,
  );

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    if (existing.kind === 'update') {
      const merged: PendingTripOperation = {
        kind: 'update',
        tripId,
        changes: { ...existing.changes, ...changes },
        calculatedCost: calculatedCost ?? existing.calculatedCost,
      };
      const copy = [...queue];
      copy[existingIndex] = merged;
      return copy;
    }
  }

  return [
    ...queue,
    {
      kind: 'update',
      tripId,
      changes,
      calculatedCost,
    },
  ];
}

export function enqueueTripDelete(
  queue: readonly PendingTripOperation[],
  tripId: string,
): PendingTripOperation[] {
  if (isLocalTripId(tripId)) {
    const clientGeneratedId = clientGeneratedIdOfTrip(tripId);
    return queue.filter(
      operation =>
        operation.kind !== 'create' ||
        operation.clientGeneratedId !== clientGeneratedId,
    );
  }

  const filtered = queue.filter(
    op => !(op.kind === 'update' && op.tripId === tripId),
  );
  return [...filtered, { kind: 'delete', tripId }];
}

export function applyPendingTripOperations(
  cachedTrips: readonly Trip[],
  operations: readonly PendingTripOperation[],
): Trip[] {
  let list = [...cachedTrips];

  for (const op of operations) {
    if (op.kind === 'create') {
      const exists = list.some(
        t =>
          t.id === localTripId(op.clientGeneratedId) ||
          t.id === op.clientGeneratedId,
      );
      if (!exists) {
        list.push(
          pendingCreateToTrip(
            op.clientGeneratedId,
            op.payload,
            op.calculatedCost,
          ),
        );
      }
    } else if (op.kind === 'update') {
      list = list.map(t => {
        if (t.id === op.tripId) {
          return {
            ...t,
            ...op.changes,
            distanceKm:
              op.changes.distanceKm != null
                ? String(op.changes.distanceKm)
                : t.distanceKm,
            cost:
              op.calculatedCost != null
                ? String(op.calculatedCost)
                : op.changes.cost != null
                ? String(op.changes.cost)
                : t.cost,
            pendingSync: true,
          };
        }
        return t;
      });
    } else if (op.kind === 'delete') {
      list = list.filter(t => t.id !== op.tripId);
    }
  }

  return list;
}

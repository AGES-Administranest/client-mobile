import {
  applyPendingTripOperations,
  clientGeneratedIdOfTrip,
  enqueueTripDelete,
  enqueueTripUpdate,
  isLocalTripId,
  localTripId,
  pendingCreateToTrip,
  type PendingTripOperation,
} from './offlineTrips';
import type { Trip } from './trip.types';

describe('offlineTrips', () => {
  const CLIENT_UUID = '123e4567-e89b-12d3-a456-426614174000';

  it('generates and checks local trip ids', () => {
    const localId = localTripId(CLIENT_UUID);
    expect(localId).toBe(`local:trip:${CLIENT_UUID}`);
    expect(isLocalTripId(localId)).toBe(true);
    expect(isLocalTripId('regular-backend-id')).toBe(false);
    expect(clientGeneratedIdOfTrip(localId)).toBe(CLIENT_UUID);
  });

  it('converts pending create to Trip object with pendingSync=true', () => {
    const trip = pendingCreateToTrip(
      CLIENT_UUID,
      {
        mode: 'OWN_VEHICLE',
        vehicleId: 'veh-1',
        occurredOn: '2026-10-18',
        origin: 'Casa',
        destination: 'Clínica',
        distanceKm: 30,
      },
      14.16,
    );

    expect(trip.id).toBe(`local:trip:${CLIENT_UUID}`);
    expect(trip.pendingSync).toBe(true);
    expect(trip.cost).toBe('14.16');
    expect(trip.distanceKm).toBe('30');
    expect(trip.origin).toBe('Casa');
    expect(trip.destination).toBe('Clínica');
  });

  it('merges update into existing pending create for local ids', () => {
    const queue: PendingTripOperation[] = [
      {
        kind: 'create',
        clientGeneratedId: CLIENT_UUID,
        payload: {
          mode: 'OWN_VEHICLE',
          occurredOn: '2026-10-18',
          origin: 'Casa',
          destination: 'Clínica',
          vehicleId: 'veh-1',
          distanceKm: 30,
        },
        calculatedCost: 14.16,
      },
    ];

    const localId = localTripId(CLIENT_UUID);
    const updated = enqueueTripUpdate(
      queue,
      localId,
      { distanceKm: 40 },
      18.88,
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].kind).toBe('create');
    if (updated[0].kind === 'create') {
      expect(updated[0].payload.distanceKm).toBe(40);
      expect(updated[0].calculatedCost).toBe(18.88);
    }
  });

  it('enqueues update for backend trips', () => {
    const queue: PendingTripOperation[] = [];
    const updated = enqueueTripUpdate(
      queue,
      'trip-real-id',
      { distanceKm: 50 },
      23.6,
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].kind).toBe('update');
    if (updated[0].kind === 'update') {
      expect(updated[0].tripId).toBe('trip-real-id');
      expect(updated[0].changes.distanceKm).toBe(50);
    }
  });

  it('removes local trip from queue on delete without leaving delete operation', () => {
    const localId = localTripId(CLIENT_UUID);
    const queue: PendingTripOperation[] = [
      {
        kind: 'create',
        clientGeneratedId: CLIENT_UUID,
        payload: {
          mode: 'RIDE',
          occurredOn: '2026-10-18',
          origin: 'A',
          destination: 'B',
          cost: 30,
        },
        calculatedCost: 30,
      },
    ];

    const afterDelete = enqueueTripDelete(queue, localId);
    expect(afterDelete).toHaveLength(0);
  });

  it('enqueues delete for backend trips', () => {
    const queue: PendingTripOperation[] = [];
    const afterDelete = enqueueTripDelete(queue, 'backend-trip-123');
    expect(afterDelete).toEqual([
      { kind: 'delete', tripId: 'backend-trip-123' },
    ]);
  });

  it('applies pending operations to cached trips', () => {
    const cached: Trip[] = [
      {
        id: 'trip-1',
        mode: 'OWN_VEHICLE',
        vehicleId: 'veh-1',
        appointmentId: null,
        clientId: null,
        occurredOn: '2026-10-18',
        origin: 'Casa',
        destination: 'Clínica',
        distanceKm: '20',
        cost: '9.44',
      },
      {
        id: 'trip-2',
        mode: 'RIDE',
        vehicleId: null,
        appointmentId: null,
        clientId: null,
        occurredOn: '2026-10-18',
        origin: 'Clínica',
        destination: 'Casa',
        distanceKm: null,
        cost: '35.00',
      },
    ];

    const operations: PendingTripOperation[] = [
      {
        kind: 'create',
        clientGeneratedId: 'new-uuid',
        payload: {
          mode: 'RIDE',
          occurredOn: '2026-10-19',
          origin: 'Hotel',
          destination: 'Aeroporto',
          cost: 50,
        },
        calculatedCost: 50,
      },
      {
        kind: 'update',
        tripId: 'trip-1',
        changes: { distanceKm: 25 },
        calculatedCost: 11.8,
      },
      {
        kind: 'delete',
        tripId: 'trip-2',
      },
    ];

    const result = applyPendingTripOperations(cached, operations);
    expect(result).toHaveLength(2); // trip-2 deleted, 1 new created

    const updatedTrip1 = result.find(t => t.id === 'trip-1');
    expect(updatedTrip1?.distanceKm).toBe('25');
    expect(updatedTrip1?.cost).toBe('11.8');
    expect(updatedTrip1?.pendingSync).toBe(true);

    const deletedTrip2 = result.find(t => t.id === 'trip-2');
    expect(deletedTrip2).toBeUndefined();

    const createdTrip = result.find(t => t.id === localTripId('new-uuid'));
    expect(createdTrip).toBeDefined();
    expect(createdTrip?.origin).toBe('Hotel');
  });
});

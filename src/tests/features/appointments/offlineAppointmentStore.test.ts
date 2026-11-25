import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Appointment } from 'features/appointments/domain/appointment';
import {
  discardOfflineAppointment,
  findCachedAppointment,
  findOfflineAppointment,
  loadMonthCache,
  loadOutbox,
  loadRejections,
  newClientGeneratedId,
  queueAppointmentCreate,
  queueAppointmentUpdate,
  resolveLocalAppointmentId,
  saveMonthCache,
  saveRejections,
  saveResolvedAppointmentId,
  subscribeOfflineAppointments,
} from 'features/appointments/services/offlineAppointmentStore';

const USER = 'user-1';
const LOCAL = 'local:cg-1';
const payload = {
  startsAt: '2026-10-20T13:00:00.000Z',
  status: 'SCHEDULED' as const,
  patientName: 'Maya',
};
const cached = {
  id: 'appointment-1',
  startsAt: payload.startsAt,
  endsAt: null,
  status: 'SCHEDULED',
  patientName: 'Maya',
} as Appointment;

beforeEach(() => AsyncStorage.clear());

describe('offlineAppointmentStore', () => {
  it('knows a month never opened from one that was empty', async () => {
    await expect(loadMonthCache(USER, '2026-10')).resolves.toBeNull();

    await saveMonthCache(USER, '2026-10', []);

    await expect(loadMonthCache(USER, '2026-10')).resolves.toEqual([]);
    await expect(loadMonthCache('user-2', '2026-10')).resolves.toBeNull();
  });

  it('goes on without a cache when it cannot be written', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));

    await expect(
      saveMonthCache(USER, '2026-10', [cached]),
    ).resolves.toBeUndefined();
  });

  it('but tells when an appointment could not be queued', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));

    await expect(queueAppointmentCreate(USER, 'cg-1', payload)).rejects.toThrow(
      'full',
    );
  });

  it('gives each appointment an id of its own', () => {
    expect(newClientGeneratedId()).not.toBe(newClientGeneratedId());
  });

  it('tells whoever is listening about each change in the queue', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeOfflineAppointments(listener);

    await queueAppointmentCreate(USER, 'cg-1', payload);
    await queueAppointmentUpdate(USER, 'appointment-1', { notes: 'x' });
    await discardOfflineAppointment(USER, LOCAL);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await discardOfflineAppointment(USER, LOCAL);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('saves and reads back the refusals', async () => {
    const refusals = [
      {
        operation: {
          kind: 'update' as const,
          appointmentId: 'appointment-1',
          changes: {},
        },
        code: null,
      },
    ];

    await saveRejections(USER, refusals);

    await expect(loadRejections(USER)).resolves.toEqual(refusals);
  });

  it('discards only the appointment asked for', async () => {
    await queueAppointmentCreate(USER, 'cg-1', payload);
    await queueAppointmentCreate(USER, 'cg-2', payload);
    await queueAppointmentUpdate(USER, 'appointment-1', { notes: 'x' });

    await discardOfflineAppointment(USER, LOCAL);

    await expect(loadOutbox(USER)).resolves.toEqual([
      { kind: 'create', clientGeneratedId: 'cg-2', payload },
      {
        kind: 'update',
        appointmentId: 'appointment-1',
        changes: { notes: 'x' },
      },
    ]);
  });

  it('edits by the real id an appointment that was already sent', async () => {
    await expect(resolveLocalAppointmentId(USER, LOCAL)).resolves.toBeNull();
    await saveResolvedAppointmentId(USER, 'cg-1', 'appointment-1');

    await queueAppointmentUpdate(USER, LOCAL, { notes: 'x' });

    await expect(resolveLocalAppointmentId(USER, LOCAL)).resolves.toBe(
      'appointment-1',
    );
    await expect(
      resolveLocalAppointmentId(USER, 'appointment-1'),
    ).resolves.toBeNull();
    await expect(loadOutbox(USER)).resolves.toEqual([
      {
        kind: 'update',
        appointmentId: 'appointment-1',
        changes: { notes: 'x' },
      },
    ]);
  });

  describe('finding an appointment without a connection', () => {
    it('finds one saved in any month of the user', async () => {
      await saveMonthCache(USER, '2026-09', []);
      await saveMonthCache(USER, '2026-10', [cached]);

      await expect(
        findCachedAppointment(USER, 'appointment-1'),
      ).resolves.toEqual(cached);
      await expect(findCachedAppointment(USER, 'other')).resolves.toBeNull();
      await expect(
        findCachedAppointment('user-2', 'appointment-1'),
      ).resolves.toBeNull();
    });

    it('finds nothing when the device cannot be read', async () => {
      jest
        .mocked(AsyncStorage.getAllKeys)
        .mockRejectedValueOnce(new Error('broke'));

      await expect(
        findCachedAppointment(USER, 'appointment-1'),
      ).resolves.toBeNull();
    });

    it('finds one still in the queue', async () => {
      await queueAppointmentCreate(USER, 'cg-1', payload);

      await expect(findOfflineAppointment(USER, LOCAL)).resolves.toMatchObject({
        id: LOCAL,
        patientName: 'Maya',
        pendingSync: true,
      });
      await expect(
        findOfflineAppointment(USER, 'local:gone'),
      ).resolves.toBeNull();
    });

    it('applies the pending edits to a saved one', async () => {
      await saveMonthCache(USER, '2026-10', [cached]);
      await queueAppointmentUpdate(USER, 'appointment-1', {
        patientName: 'Thor',
      });

      await expect(
        findOfflineAppointment(USER, 'appointment-1'),
      ).resolves.toMatchObject({ patientName: 'Thor' });
      await expect(findOfflineAppointment(USER, 'other')).resolves.toBeNull();
    });
  });
});

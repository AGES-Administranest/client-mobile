import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, apiClient } from 'shared/services/apiClient';

import { syncPendingAppointments } from './appointmentSyncService';
import {
  loadOutbox,
  loadRejections,
  queueAppointmentUpdate,
  saveOutbox,
} from './offlineAppointmentStore';
import type { PendingAppointmentOperation } from '../domain/offlineAppointments';

const mockResolveLocalClientId = jest.fn();

jest.mock('features/clients', () => ({
  resolveLocalClientId: (...args: unknown[]) =>
    mockResolveLocalClientId(...args),
}));
jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { post: jest.fn(), patch: jest.fn() },
}));

const post = apiClient.post as jest.Mock;
const patch = apiClient.patch as jest.Mock;

const USER = 'user-1';
const CREATE: PendingAppointmentOperation = {
  kind: 'create',
  clientGeneratedId: 'cg-1',
  payload: {
    startsAt: '2026-09-30T18:00:00.000Z',
    endsAt: '2026-09-30T19:00:00.000Z',
    status: 'SCHEDULED',
    patientName: 'Thomas',
  },
};
const UPDATE: PendingAppointmentOperation = {
  kind: 'update',
  appointmentId: 'server-1',
  changes: { amount: 300 },
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  post.mockResolvedValue([{ id: 'server-9' }]);
  mockResolveLocalClientId.mockImplementation(
    async (_user: string, clientId: string) => ({
      status: 'resolved',
      clientId,
    }),
  );
  patch.mockResolvedValue({ id: 'server-1' });
});

test('envia o create pelo /sync com o clientGeneratedId e o update por PATCH, esvaziando a fila', async () => {
  await saveOutbox(USER, [CREATE, UPDATE]);

  const result = await syncPendingAppointments('token', USER);

  expect(post).toHaveBeenCalledWith(
    '/appointments/sync',
    [{ ...CREATE.payload, clientGeneratedId: 'cg-1' }],
    { token: 'token' },
  );
  expect(patch).toHaveBeenCalledWith(
    '/appointments/server-1',
    { amount: 300 },
    { token: 'token' },
  );
  expect(result).toEqual({ synced: 2, rejected: 0, pending: 0 });
  expect(await loadOutbox(USER)).toEqual([]);
});

test('sem rede, para e mantém a fila inteira para a próxima tentativa', async () => {
  await saveOutbox(USER, [CREATE, UPDATE]);
  post.mockRejectedValue(new TypeError('Network request failed'));

  const result = await syncPendingAppointments('token', USER);

  expect(patch).not.toHaveBeenCalled();
  expect(result).toEqual({ synced: 0, rejected: 0, pending: 2 });
  expect(await loadOutbox(USER)).toEqual([CREATE, UPDATE]);
});

test('um conflito tira a operação da fila, guarda o aviso e segue com as outras', async () => {
  await saveOutbox(USER, [CREATE, UPDATE]);
  post.mockRejectedValue(
    new ApiError('conflict', 'APPOINTMENT_TIME_CONFLICT', 409),
  );

  const result = await syncPendingAppointments('token', USER);

  expect(patch).toHaveBeenCalled();
  expect(result).toEqual({ synced: 1, rejected: 1, pending: 0 });
  expect(await loadRejections(USER)).toEqual([
    { operation: CREATE, code: 'APPOINTMENT_TIME_CONFLICT' },
  ]);
});

test.each([401, 403, 429, 500])(
  'um %i não descarta nada: tenta de novo depois',
  async status => {
    await saveOutbox(USER, [CREATE]);
    post.mockRejectedValue(new ApiError('x', null, status));

    const result = await syncPendingAppointments('token', USER);

    expect(result.pending).toBe(1);
    expect(await loadRejections(USER)).toEqual([]);
  },
);

test('uma operação editada enquanto era enviada fica na fila com a edição', async () => {
  await saveOutbox(USER, [CREATE]);
  const edited: PendingAppointmentOperation = {
    ...CREATE,
    payload: { ...CREATE.payload, patientName: 'Oliver' },
  };
  post.mockImplementationOnce(async () => {
    await saveOutbox(USER, [edited]);
    return [{ id: 'server-9' }];
  });

  await syncPendingAppointments('token', USER);

  // A versão editada foi enviada logo em seguida, na mesma rodada.
  expect(post).toHaveBeenLastCalledWith(
    '/appointments/sync',
    [{ ...edited.payload, clientGeneratedId: 'cg-1' }],
    { token: 'token' },
  );
  expect(await loadOutbox(USER)).toEqual([]);
});

describe('agendamento que aponta para uma clínica cadastrada offline', () => {
  const WITH_LOCAL_CLINIC: PendingAppointmentOperation = {
    ...CREATE,
    payload: { ...CREATE.payload, clientId: 'local:clinic-1' },
  };

  test('sai com o id real da clínica depois que ela sincronizou', async () => {
    await saveOutbox(USER, [WITH_LOCAL_CLINIC]);
    mockResolveLocalClientId.mockResolvedValue({
      status: 'resolved',
      clientId: 'clinic-real',
    });

    await syncPendingAppointments('token', USER);

    expect(post).toHaveBeenCalledWith(
      '/appointments/sync',
      [
        expect.objectContaining({
          clientId: 'clinic-real',
          clientGeneratedId: 'cg-1',
        }),
      ],
      { token: 'token' },
    );
    expect(await loadOutbox(USER)).toEqual([]);
  });

  test('espera na fila enquanto a clínica não sincronizou, sem travar as outras', async () => {
    await saveOutbox(USER, [WITH_LOCAL_CLINIC, UPDATE]);
    mockResolveLocalClientId.mockImplementation(
      async (_user: string, clientId: string) =>
        clientId === 'local:clinic-1'
          ? { status: 'pending' }
          : { status: 'resolved', clientId },
    );

    const result = await syncPendingAppointments('token', USER);

    expect(post).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalled();
    expect(result).toEqual({ synced: 1, rejected: 0, pending: 1 });
    expect(await loadOutbox(USER)).toEqual([WITH_LOCAL_CLINIC]);
  });

  test('é recusado quando a clínica dele foi recusada', async () => {
    await saveOutbox(USER, [WITH_LOCAL_CLINIC]);
    mockResolveLocalClientId.mockResolvedValue({ status: 'missing' });

    await syncPendingAppointments('token', USER);

    expect(post).not.toHaveBeenCalled();
    expect(await loadRejections(USER)).toEqual([
      { operation: WITH_LOCAL_CLINIC, code: 'CLIENT_NOT_SYNCED' },
    ]);
  });
});

test('editar pelo id local um agendamento que já sincronizou vai para o id real', async () => {
  await saveOutbox(USER, [CREATE]);
  await syncPendingAppointments('token', USER);

  await queueAppointmentUpdate(USER, 'local:cg-1', { notes: 'jejum' });

  expect(await loadOutbox(USER)).toEqual([
    { kind: 'update', appointmentId: 'server-9', changes: { notes: 'jejum' } },
  ]);
});

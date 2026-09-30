import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, apiClient } from 'shared/services/apiClient';

import { syncPendingClinics } from './clinicSyncService';
import {
  loadClientOutbox,
  loadClientRejections,
  loadClientsWithOffline,
  resolveLocalClientId,
  saveClientOutbox,
} from './offlineClientStore';
import type { PendingClientOperation } from '../domain/offlineClients';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const patch = apiClient.patch as jest.Mock;

const USER = 'user-1';
const CREATE: PendingClientOperation = {
  kind: 'create',
  localId: 'local:uuid-1',
  payload: { type: 'CLINIC', name: 'Clínica Casa' },
};
const UPDATE: PendingClientOperation = {
  kind: 'update',
  clientId: 'server-1',
  changes: { city: 'Canoas' },
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  post.mockResolvedValue({ id: 'server-9' });
  patch.mockResolvedValue({ id: 'server-1' });
});

test('cria por POST /client, edita por PATCH e guarda o id real da criada offline', async () => {
  await saveClientOutbox(USER, [CREATE, UPDATE]);

  const result = await syncPendingClinics('token', USER);

  expect(post).toHaveBeenCalledWith('/client', CREATE.payload, {
    token: 'token',
  });
  expect(patch).toHaveBeenCalledWith(
    '/client/server-1',
    { city: 'Canoas' },
    { token: 'token' },
  );
  expect(result).toEqual({ synced: 2, rejected: 0, pending: 0 });
  expect(await resolveLocalClientId(USER, 'local:uuid-1')).toEqual({
    status: 'resolved',
    clientId: 'server-9',
  });
});

test('nome duplicado num reenvio vale como já criada: usa a clínica de mesmo nome', async () => {
  await saveClientOutbox(USER, [CREATE]);
  post.mockRejectedValue(new ApiError('dup', 'DUPLICATED_CLIENT_NAME', 409));
  get.mockResolvedValue([{ id: 'server-5', name: 'clinica casa' }]);

  const result = await syncPendingClinics('token', USER);

  expect(result).toEqual({ synced: 1, rejected: 0, pending: 0 });
  expect(await resolveLocalClientId(USER, 'local:uuid-1')).toEqual({
    status: 'resolved',
    clientId: 'server-5',
  });
});

test('sem rede, mantém a fila e a clínica segue pendente', async () => {
  await saveClientOutbox(USER, [CREATE]);
  post.mockRejectedValue(new TypeError('Network request failed'));

  const result = await syncPendingClinics('token', USER);

  expect(result.pending).toBe(1);
  expect(await resolveLocalClientId(USER, 'local:uuid-1')).toEqual({
    status: 'pending',
  });
});

test('uma recusa definitiva tira da fila, guarda o aviso e a clínica fica ausente', async () => {
  await saveClientOutbox(USER, [CREATE]);
  post.mockRejectedValue(new ApiError('dup', 'DUPLICATED_CLIENT_TAX_ID', 409));

  await syncPendingClinics('token', USER);

  expect(await loadClientOutbox(USER)).toEqual([]);
  expect(await loadClientRejections(USER)).toEqual([
    { operation: CREATE, code: 'DUPLICATED_CLIENT_TAX_ID' },
  ]);
  expect(await resolveLocalClientId(USER, 'local:uuid-1')).toEqual({
    status: 'missing',
  });
});

describe('loadClientsWithOffline', () => {
  const SERVER = { id: 'server-1', name: 'Clínica VetNova' } as never;

  test('com rede, salva a lista; sem rede, devolve a salva com a fila por cima', async () => {
    await loadClientsWithOffline(USER, async () => [SERVER]);
    await saveClientOutbox(USER, [CREATE]);

    const offline = await loadClientsWithOffline(USER, () =>
      Promise.reject(new TypeError('Network request failed')),
    );

    expect(offline.isOffline).toBe(true);
    expect(offline.clients.map(client => client.name)).toEqual([
      'Clínica VetNova',
      'Clínica Casa',
    ]);
  });

  test('sem rede e sem nada salvo, o erro continua para a tela', async () => {
    const failure = new TypeError('Network request failed');
    await expect(
      loadClientsWithOffline(USER, () => Promise.reject(failure)),
    ).rejects.toBe(failure);
  });
});

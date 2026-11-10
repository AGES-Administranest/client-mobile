import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadResolvedSupplierIds,
  loadSupplierOutbox,
  loadSupplierRejections,
  saveSupplierOutbox,
} from './offlineSupplierStore';
import { syncPendingSuppliers } from './supplierSyncService';
import type { PendingSupplierOperation } from '../domain/offlineSuppliers';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const patch = apiClient.patch as jest.Mock;

const USER = 'user-1';
const BODY = {
  name: 'Vet Sul',
  email: null,
  taxId: '11222333000181',
  taxIdType: 'CNPJ' as const,
  phone: null,
};
const CREATE: PendingSupplierOperation = {
  kind: 'create',
  localId: 'local:uuid-1',
  payload: BODY,
};
const UPDATE: PendingSupplierOperation = {
  kind: 'update',
  supplierId: 'server-1',
  changes: { phone: '(51) 3333-4444' },
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  post.mockResolvedValue({ id: 'server-9' });
  patch.mockResolvedValue({ id: 'server-1' });
});

test('cria por POST /supplier, edita por PATCH e guarda o id real do criado offline', async () => {
  await saveSupplierOutbox(USER, [CREATE, UPDATE]);

  const result = await syncPendingSuppliers('token', USER);

  expect(post).toHaveBeenCalledWith('/supplier', BODY, { token: 'token' });
  expect(patch).toHaveBeenCalledWith(
    '/supplier/server-1',
    { phone: '(51) 3333-4444' },
    { token: 'token' },
  );
  expect(result).toEqual({ synced: 2, rejected: 0, pending: 0 });
  expect((await loadResolvedSupplierIds(USER))['local:uuid-1']).toBe(
    'server-9',
  );
});

test('o POST não leva `active`; um criado e desativado offline recebe o PATCH depois', async () => {
  await saveSupplierOutbox(USER, [
    { ...CREATE, payload: { ...BODY, active: false } } as never,
  ]);

  await syncPendingSuppliers('token', USER);

  expect(post).toHaveBeenCalledWith('/supplier', BODY, { token: 'token' });
  expect(patch).toHaveBeenCalledWith(
    '/supplier/server-9',
    { active: false },
    { token: 'token' },
  );
});

test('CNPJ duplicado no reenvio é o fornecedor que já foi criado', async () => {
  post.mockRejectedValue(
    new ApiError('dup', 'DUPLICATED_SUPPLIER_TAX_ID', 409),
  );
  get.mockImplementation(async (path: string) =>
    path.includes('active=true')
      ? [{ id: 'server-7', taxId: '11.222.333/0001-81' }]
      : [],
  );
  await saveSupplierOutbox(USER, [CREATE]);

  const result = await syncPendingSuppliers('token', USER);

  expect(result).toEqual({ synced: 1, rejected: 0, pending: 0 });
  expect((await loadResolvedSupplierIds(USER))['local:uuid-1']).toBe(
    'server-7',
  );
});

test('CNPJ duplicado que não está na lista é recusa definitiva', async () => {
  post.mockRejectedValue(
    new ApiError('dup', 'DUPLICATED_SUPPLIER_TAX_ID', 409),
  );
  get.mockResolvedValue([]);
  await saveSupplierOutbox(USER, [CREATE]);

  const result = await syncPendingSuppliers('token', USER);

  expect(result).toEqual({ synced: 0, rejected: 1, pending: 0 });
  expect(await loadSupplierRejections(USER)).toEqual([
    { operation: CREATE, code: 'DUPLICATED_SUPPLIER_TAX_ID' },
  ]);
});

test('sem rede a fila fica como está para a próxima tentativa', async () => {
  post.mockRejectedValue(new TypeError('Network request failed'));
  await saveSupplierOutbox(USER, [CREATE, UPDATE]);

  const result = await syncPendingSuppliers('token', USER);

  expect(result).toEqual({ synced: 0, rejected: 0, pending: 2 });
  expect(patch).not.toHaveBeenCalled();
  expect(await loadSupplierOutbox(USER)).toEqual([CREATE, UPDATE]);
});

test('uma recusa de dado (400) sai da fila e não trava as seguintes', async () => {
  patch.mockRejectedValueOnce(new ApiError('bad', 'VALIDATION', 400));
  await saveSupplierOutbox(USER, [UPDATE, CREATE]);

  const result = await syncPendingSuppliers('token', USER);

  expect(result).toEqual({ synced: 1, rejected: 1, pending: 0 });
});

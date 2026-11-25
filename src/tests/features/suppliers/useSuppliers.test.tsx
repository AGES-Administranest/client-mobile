import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react-test-renderer';

import type {
  Supplier,
  SupplierPayload,
} from 'features/suppliers/domain/supplierForm';
import {
  DUPLICATED_TAX_ID,
  useSuppliers,
  type SaveResult,
} from 'features/suppliers/hooks/useSuppliers';
import {
  loadSupplierOutbox,
  loadSupplierRejections,
  saveResolvedSupplierId,
  saveSupplierRejections,
} from 'features/suppliers/services/offlineSupplierStore';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from 'features/suppliers/services/supplierService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' } as { id: string } | null,
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/suppliers/services/supplierService', () => ({
  createSupplier: jest.fn(),
  deleteSupplier: jest.fn(),
  fetchSuppliers: jest.fn(),
  updateSupplier: jest.fn(),
}));

const fetchAll = jest.mocked(fetchSuppliers);
const create = jest.mocked(createSupplier);
const update = jest.mocked(updateSupplier);
const remove = jest.mocked(deleteSupplier);

const NETWORK_DOWN = new TypeError('Network request failed');
const DUPLICATED = new ApiError('x', 'DUPLICATED_SUPPLIER_TAX_ID', 409);
const REFUSED = new ApiError('x', 'VALIDATION_ERROR', 400);
const CNPJ = '11.222.333/0001-81';

const supplier = (id: string, overrides: Partial<Supplier> = {}): Supplier => ({
  id,
  name: id,
  email: null,
  taxId: null,
  phone: null,
  active: true,
  ...overrides,
});

const payload = (
  overrides: Partial<SupplierPayload> = {},
): SupplierPayload => ({
  name: 'Vet Distribuidora',
  email: null,
  taxId: null,
  phone: null,
  active: true,
  ...overrides,
});

const A = supplier('a');
const INACTIVE = supplier('old', { active: false });

const mount = () => renderHook(useSuppliers);
type Hook = Awaited<ReturnType<typeof mount>>;
const idsOf = (hook: Hook) => hook.current.suppliers.map(item => item.id);

async function run<T>(action: () => Promise<T>): Promise<T> {
  let result!: T;
  await act(async () => {
    result = await action();
  });
  return result;
}

beforeEach(async () => {
  [fetchAll, create, update, remove].forEach(mock => mock.mockReset());
  fetchAll.mockResolvedValue([INACTIVE, A]);
  mockAuth.session = { idToken: 'token' };
  mockAuth.account = { id: 'user-1' };
  await AsyncStorage.clear();
});

describe('loading', () => {
  it('lists the active suppliers first', async () => {
    const hook = await mount();

    expect(fetchAll).toHaveBeenCalledWith('token');
    expect(idsOf(hook)).toEqual(['a', 'old']);
    expect(hook.current).toMatchObject({ isLoading: false, failure: null });
  });

  it('has nothing to load without a session', async () => {
    mockAuth.session = null;

    const hook = await mount();

    expect(hook.current.isLoading).toBe(false);
    expect(fetchAll).not.toHaveBeenCalled();
  });

  it('shows the list saved earlier when the network is down', async () => {
    (await mount()).unmount();
    fetchAll.mockRejectedValue(NETWORK_DOWN);

    expect(idsOf(await mount())).toEqual(['a', 'old']);
  });

  it.each([
    ['nothing was saved', NETWORK_DOWN],
    ['the server refused', REFUSED],
  ])('fails when %s', async (_case, failure) => {
    fetchAll.mockRejectedValue(failure);

    expect((await mount()).current.failure).toBe('suppliers.loadFailure');
  });

  it('goes on when the list cannot be saved', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));

    expect(idsOf(await mount())).toEqual(['a', 'old']);
  });

  it('starts from nothing when what was saved cannot be read', async () => {
    fetchAll.mockRejectedValue(NETWORK_DOWN);
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{broken');

    expect((await mount()).current.failure).toBe('suppliers.loadFailure');
  });
});

describe('creating', () => {
  const save = (hook: Hook, data = payload()): Promise<SaveResult> =>
    run(() => hook.current.create(data));

  it('adds what the server created', async () => {
    create.mockResolvedValue(supplier('new'));
    const hook = await mount();

    expect(await save(hook)).toEqual(supplier('new'));

    expect(idsOf(hook)).toEqual(['a', 'new', 'old']);
    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([]);
  });

  it('tells a repeated CNPJ from any other refusal', async () => {
    const hook = await mount();

    create.mockRejectedValueOnce(DUPLICATED);
    expect(await save(hook)).toBe(DUPLICATED_TAX_ID);
    create.mockRejectedValueOnce(REFUSED);
    expect(await save(hook)).toBeNull();

    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([]);
  });

  it('queues the supplier when the network is down', async () => {
    const hook = await mount();
    create.mockRejectedValue(NETWORK_DOWN);
    fetchAll.mockRejectedValue(NETWORK_DOWN);

    const saved = await save(hook, payload({ taxId: CNPJ }));

    expect(saved).toMatchObject({ name: 'Vet Distribuidora', active: true });
    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        kind: 'create',
        payload: expect.objectContaining({ taxId: CNPJ, taxIdType: 'CNPJ' }),
      }),
    ]);
    expect(hook.current.suppliers.map(item => item.name)).toContain(
      'Vet Distribuidora',
    );
  });

  it('finds a repeated CNPJ in the device before queueing', async () => {
    fetchAll.mockResolvedValue([supplier('a', { taxId: '11222333000181' })]);
    const hook = await mount();
    create.mockRejectedValue(NETWORK_DOWN);

    expect(await save(hook, payload({ taxId: CNPJ }))).toBe(DUPLICATED_TAX_ID);
    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([]);
  });

  it('does nothing without a session or an account to queue for', async () => {
    mockAuth.account = null;
    const withoutAccount = await mount();
    create.mockRejectedValue(NETWORK_DOWN);
    expect(await save(withoutAccount)).toBeNull();
    withoutAccount.unmount();

    mockAuth.session = null;
    create.mockClear();
    expect(await save(await mount())).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('editing', () => {
  const save = (hook: Hook, id = 'a', data = payload()): Promise<SaveResult> =>
    run(() => hook.current.update(id, data));

  it('replaces the supplier in the list', async () => {
    update.mockResolvedValue(supplier('a', { name: 'Novo nome' }));
    const hook = await mount();

    await save(hook);

    expect(hook.current.suppliers[0].name).toBe('Novo nome');
  });

  it('tells a repeated CNPJ from any other refusal', async () => {
    const hook = await mount();

    update.mockRejectedValueOnce(DUPLICATED);
    expect(await save(hook)).toBe(DUPLICATED_TAX_ID);
    update.mockRejectedValueOnce(REFUSED);
    expect(await save(hook)).toBeNull();
  });

  it('queues the edit when the network is down, joining it to the last', async () => {
    const hook = await mount();
    update.mockRejectedValue(NETWORK_DOWN);
    fetchAll.mockRejectedValue(NETWORK_DOWN);

    await save(hook);
    const saved = await save(hook, 'a', payload({ name: 'Outro' }));

    expect(saved).toMatchObject({ id: 'a', name: 'Outro' });
    await expect(loadSupplierOutbox('user-1')).resolves.toHaveLength(1);
  });

  it('may keep its own CNPJ, not the one of another', async () => {
    fetchAll.mockResolvedValue([supplier('a', { taxId: CNPJ }), supplier('b')]);
    const hook = await mount();
    update.mockRejectedValue(NETWORK_DOWN);

    expect(await save(hook, 'b', payload({ taxId: CNPJ }))).toBe(
      DUPLICATED_TAX_ID,
    );
    expect(await save(hook, 'a', payload({ taxId: CNPJ }))).toMatchObject({
      id: 'a',
    });
  });

  it('edits in the queue a supplier that was never sent', async () => {
    const hook = await mount();
    create.mockRejectedValue(NETWORK_DOWN);
    const queued = (await run(() =>
      hook.current.create(payload()),
    )) as Supplier;

    const saved = await save(hook, queued.id, payload({ name: 'Outro' }));

    expect(update).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ id: queued.id, name: 'Outro' });
    await expect(loadSupplierOutbox('user-1')).resolves.toHaveLength(1);
  });

  it('edits by its real id a supplier that was just sent', async () => {
    const hook = await mount();
    await saveResolvedSupplierId('user-1', 'local:1', 'a');

    expect(await save(hook, 'local:1')).toMatchObject({ id: 'a' });
    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ kind: 'update', supplierId: 'a' }),
    ]);
  });

  it('answers nothing for a supplier it does not know', async () => {
    const hook = await mount();

    expect(await save(hook, 'local:unknown')).toBeNull();
  });

  it('does nothing without a session or an account to queue for', async () => {
    mockAuth.account = null;
    const withoutAccount = await mount();
    update.mockRejectedValue(NETWORK_DOWN);
    expect(await save(withoutAccount)).toBeNull();
    withoutAccount.unmount();

    mockAuth.session = null;
    expect(await save(await mount())).toBeNull();
  });
});

describe('removing', () => {
  const drop = (hook: Hook, id = 'a') => run(() => hook.current.remove(id));

  it('keeps the supplier in the list, as inactive', async () => {
    const hook = await mount();

    expect(await drop(hook)).toBe(true);

    expect(remove).toHaveBeenCalledWith('token', 'a');
    expect(hook.current.suppliers.every(item => !item.active)).toBe(true);
  });

  it('inactivates in the queue when the network is down', async () => {
    const hook = await mount();
    remove.mockRejectedValue(NETWORK_DOWN);

    expect(await drop(hook)).toBe(true);

    await expect(loadSupplierOutbox('user-1')).resolves.toEqual([
      { kind: 'update', supplierId: 'a', changes: { active: false } },
    ]);
  });

  it('reports a refusal and changes nothing', async () => {
    const hook = await mount();
    remove.mockRejectedValue(REFUSED);

    expect(await drop(hook)).toBe(false);
    expect(hook.current.suppliers[0].active).toBe(true);
  });

  it('does not ask the server about one that was never sent', async () => {
    const hook = await mount();

    expect(await drop(hook, 'local:unknown')).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing without a session or an account to queue for', async () => {
    mockAuth.account = null;
    const withoutAccount = await mount();
    remove.mockRejectedValue(NETWORK_DOWN);
    expect(await drop(withoutAccount)).toBe(false);
    withoutAccount.unmount();

    mockAuth.session = null;
    expect(await drop(await mount())).toBe(false);
  });
});

it('saves and reads back the refusals', async () => {
  const refusals = [
    {
      operation: { kind: 'update' as const, supplierId: 'a', changes: {} },
      code: null,
    },
  ];

  await saveSupplierRejections('user-1', refusals);

  await expect(loadSupplierRejections('user-1')).resolves.toEqual(refusals);
});

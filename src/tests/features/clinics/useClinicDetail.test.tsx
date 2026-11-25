import { act } from 'react-test-renderer';

import { findOfflineDuplicates, queueClinicUpdate } from 'features/clients';
import type { Client } from 'features/clinics/domain/client';
import { useClinicDetail } from 'features/clinics/hooks/useClinicDetail';
import {
  deleteClient,
  updateClient,
} from 'features/clinics/services/clientService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as object | null,
  account: { id: 'user-1' } as object | null,
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/clients', () => ({
  findOfflineDuplicates: jest.fn(),
  isLocalClientId: (id: string) => id.startsWith('local:'),
  queueClinicUpdate: jest.fn(),
}));
jest.mock('features/clinics/services/clientService', () => ({
  deleteClient: jest.fn(),
  updateClient: jest.fn(),
}));

const update = jest.mocked(updateClient);
const remove = jest.mocked(deleteClient);
const duplicates = jest.mocked(findOfflineDuplicates);
const queue = jest.mocked(queueClinicUpdate);

const NETWORK_DOWN = new TypeError('Network request failed');
const DUPLICATED = new ApiError('x', 'DUPLICATED_CLIENT_TAX_ID', 409);

const clinic = (overrides: Partial<Client> = {}): Client =>
  ({
    id: 'clinic-1',
    type: 'CLINIC',
    name: 'VetSul',
    taxId: '11222333000181',
    taxIdType: 'CNPJ',
    email: 'contato@vetsul.com',
    phone: '51999990000',
    contactName: null,
    addressLine: 'Rua A, 1',
    city: 'Porto Alegre',
    state: 'RS',
    serviceDays: [],
    paymentTermsDays: null,
    preferredPaymentMethod: null,
    active: true,
    ...overrides,
  } as unknown as Client);

const mount = (initial: Client | null = clinic()) =>
  renderHook(
    (props: { clinic: Client | null }) => useClinicDetail(props.clinic),
    {
      clinic: initial,
    },
  );
type Hook = Awaited<ReturnType<typeof mount>>;

const submit = async (hook: Hook) => {
  let result: Client | null = null;
  await act(async () => {
    result = await hook.current.submit();
  });
  return result as Client | null;
};

beforeEach(() => {
  [update, remove, duplicates, queue].forEach(mock => mock.mockReset());
  duplicates.mockResolvedValue({ taxId: false, name: false });
  mockAuth.session = { idToken: 'token' };
  mockAuth.account = { id: 'user-1' };
});

describe('useClinicDetail editing', () => {
  it('starts from the clinic and starts over with another', async () => {
    const hook = await mount();
    expect(hook.current.draft.name).toBe('VetSul');
    await act(async () => hook.current.startEditing());
    expect(hook.current.isEditing).toBe(true);

    await hook.rerender({ clinic: null });
    expect(hook.current.draft.name).toBe('VetSul');

    await hook.rerender({ clinic: clinic({ id: 'c2', name: 'HospVet' }) });
    expect(hook.current.draft.name).toBe('HospVet');
    expect(hook.current.isEditing).toBe(false);
  });

  it('points at a wrong field until it is edited, and sends nothing', async () => {
    const hook = await mount();
    await act(async () => hook.current.setField('name', ''));

    expect(await submit(hook)).toBeNull();
    expect(hook.current.errors.name).toBeDefined();
    expect(update).not.toHaveBeenCalled();

    await act(async () => hook.current.setField('name', 'VetSul 2'));
    expect(hook.current.errors.name).toBeUndefined();
  });

  it('answers with what the server saved', async () => {
    update.mockResolvedValue(clinic({ name: 'VetSul 2' }));
    const hook = await mount();
    await act(async () => hook.current.setField('name', 'VetSul 2'));

    expect(await submit(hook)).toMatchObject({ name: 'VetSul 2' });

    expect(update).toHaveBeenCalledWith(
      'token',
      'clinic-1',
      expect.objectContaining({ name: 'VetSul 2' }),
    );
    expect(hook.current).toMatchObject({ failure: null, isSaving: false });
  });

  it('has nothing to save without a clinic', async () => {
    expect(await submit(await mount(null))).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('points a repeated CNPJ at its field, any other failure at the form', async () => {
    const hook = await mount();

    update.mockRejectedValueOnce(DUPLICATED);
    await submit(hook);
    expect(hook.current.errors.cnpj).toBe('duplicated');
    expect(hook.current.failure).toBeNull();

    update.mockRejectedValueOnce(new ApiError('x', null, 500));
    await submit(hook);
    expect(hook.current.failure).not.toBeNull();
  });

  it('reports the end of the session', async () => {
    mockAuth.session = null;
    mockAuth.account = null;
    const hook = await mount();

    expect(await submit(hook)).toBeNull();
    expect(hook.current.failure).not.toBeNull();
  });
});

describe('useClinicDetail without a connection', () => {
  it('queues the edit', async () => {
    update.mockRejectedValue(NETWORK_DOWN);
    queue.mockResolvedValue(clinic({ name: 'offline' }) as never);
    const hook = await mount();

    expect(await submit(hook)).toMatchObject({ name: 'offline' });

    expect(queue).toHaveBeenCalledWith(
      'user-1',
      'clinic-1',
      expect.objectContaining({ name: 'VetSul' }),
    );
    expect(hook.current.failure).toBeNull();
  });

  it('edits in the queue a clinic that was never sent', async () => {
    queue.mockResolvedValue(clinic() as never);

    await submit(await mount(clinic({ id: 'local:1' })));

    expect(update).not.toHaveBeenCalled();
    expect(queue).toHaveBeenCalledWith('user-1', 'local:1', expect.anything());
  });

  it.each([
    [{ taxId: true, name: false }, 'duplicated', null],
    [
      { taxId: false, name: true },
      undefined,
      'clinics.newClinic.failures.duplicatedName',
    ],
  ])(
    'does not queue what repeats another: %j',
    async (found, cnpj, failure) => {
      update.mockRejectedValue(NETWORK_DOWN);
      duplicates.mockResolvedValue(found);
      const hook = await mount();

      expect(await submit(hook)).toBeNull();

      expect(queue).not.toHaveBeenCalled();
      expect(hook.current.errors.cnpj).toBe(cnpj);
      expect(hook.current.failure).toBe(failure);
    },
  );
});

describe('useClinicDetail removing', () => {
  const drop = async (hook: Hook) => {
    let removed = false;
    await act(async () => {
      removed = await hook.current.remove();
    });
    return removed;
  };

  it('removes the clinic', async () => {
    remove.mockResolvedValue(undefined as never);

    expect(await drop(await mount())).toBe(true);
    expect(remove).toHaveBeenCalledWith('token', 'clinic-1');
  });

  it('reports a failure', async () => {
    remove.mockRejectedValue(new ApiError('x', null, 500));
    const hook = await mount();

    expect(await drop(hook)).toBe(false);
    expect(hook.current.failure).not.toBeNull();
  });

  it('has nothing to remove without a clinic', async () => {
    expect(await drop(await mount(null))).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
});

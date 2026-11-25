import { act } from 'react-test-renderer';

import { fetchSuppliers } from 'features/materials';
import { useSupplierName } from 'features/stockEntry/hooks/useSupplierName';

import { renderHook } from '../../../support/renderHook';

const mockAuth = { session: { idToken: 'token' } as object | null };

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/materials', () => ({ fetchSuppliers: jest.fn() }));

const fetchAll = jest.mocked(fetchSuppliers);

const mount = (supplierId: string | null, printed: string | null = 'NA NOTA') =>
  renderHook(() => useSupplierName(supplierId, printed));

beforeEach(() => {
  fetchAll.mockReset();
  mockAuth.session = { idToken: 'token' };
});

describe('useSupplierName', () => {
  it('prefers the name of the registered supplier', async () => {
    fetchAll.mockResolvedValue([
      { id: 'other', name: 'Outro' },
      { id: 'supplier-1', name: 'Vet Distribuidora' },
    ] as never);

    expect((await mount('supplier-1')).current).toEqual({
      name: 'Vet Distribuidora',
      isRegistered: true,
    });
  });

  it('keeps the printed name when the supplier is not in the list', async () => {
    fetchAll.mockResolvedValue([]);

    expect((await mount('supplier-1')).current).toEqual({
      name: 'NA NOTA',
      isRegistered: true,
    });
  });

  it('keeps the printed name when the list cannot be read', async () => {
    fetchAll.mockRejectedValue(new Error('broke'));

    expect((await mount('supplier-1')).current.name).toBe('NA NOTA');
  });

  it.each([
    ['without a supplier', null, true],
    ['without a session', 'supplier-1', false],
  ])('does not ask for the list %s', async (_case, id, hasSession) => {
    if (!hasSession) mockAuth.session = null;

    const hook = await mount(id, null);

    expect(fetchAll).not.toHaveBeenCalled();
    expect(hook.current.name).toBeNull();
  });

  it('ignores a list that arrives after it is gone', async () => {
    let answer!: (list: never[]) => void;
    fetchAll.mockReturnValue(
      new Promise(resolve => {
        answer = resolve as never;
      }),
    );
    const hook = await mount('supplier-1');
    hook.unmount();

    await act(async () =>
      answer([{ id: 'supplier-1', name: 'Vet' }] as never[]),
    );

    expect(hook.current.name).toBe('NA NOTA');
  });
});

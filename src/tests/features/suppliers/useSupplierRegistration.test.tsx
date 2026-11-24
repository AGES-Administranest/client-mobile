import { Platform } from 'react-native';
import { act } from 'react-test-renderer';

import type { Supplier } from 'features/suppliers/domain/supplierForm';
import { useSupplierRegistration } from 'features/suppliers/hooks/useSupplierRegistration';
import {
  DUPLICATED_TAX_ID,
  type SaveResult,
} from 'features/suppliers/hooks/useSuppliers';

import { renderHook } from '../../support/renderHook';

const mockCreate = jest.fn();

jest.mock('features/suppliers/hooks/useSuppliers', () => ({
  DUPLICATED_TAX_ID: 'duplicatedTaxId',
  useSuppliers: () => ({
    suppliers: [],
    isLoading: false,
    failure: null,
    create: mockCreate,
  }),
}));

const SUPPLIER: Supplier = {
  id: 'supplier-1',
  name: 'Vet Distribuidora',
  email: null,
  taxId: null,
  phone: null,
  active: true,
};
const originalOS = Platform.OS;
const onCreated = jest.fn();

const mount = () => renderHook(() => useSupplierRegistration({ onCreated }));
type Hook = Awaited<ReturnType<typeof mount>>;

const shown = (hook: Hook) => ({
  review: hook.current.isReviewShown,
  register: hook.current.isRegisterShown,
});
const open = (hook: Hook) =>
  act(async () => hook.current.open('Vet Distribuidora'));
const openFilled = async (hook: Hook) => {
  await open(hook);
  await act(async () =>
    hook.current.form.setField('taxId', '11.222.333/0001-81'),
  );
};
const submit = (hook: Hook) => act(async () => hook.current.submit());

beforeEach(() => {
  mockCreate.mockReset();
  onCreated.mockReset();
  Platform.OS = 'android';
});
afterAll(() => {
  Platform.OS = originalOS;
});

describe('swapping the review and the registration', () => {
  it('swaps at once where two modals do not collide', async () => {
    const hook = await mount();
    expect(shown(hook)).toEqual({ review: true, register: false });

    await open(hook);
    expect(shown(hook)).toEqual({ review: false, register: true });

    await act(async () => hook.current.cancel());
    expect(shown(hook)).toEqual({ review: true, register: false });
  });

  it('waits for the previous modal to leave on iOS', async () => {
    Platform.OS = 'ios';
    const hook = await mount();

    await open(hook);
    expect(shown(hook)).toEqual({ review: false, register: false });
    await act(async () => hook.current.onRegisterLeft());
    expect(shown(hook)).toEqual({ review: false, register: false });
    await act(async () => hook.current.onReviewLeft());
    expect(shown(hook)).toEqual({ review: false, register: true });

    await act(async () => hook.current.cancel());
    await act(async () => hook.current.onReviewLeft());
    expect(shown(hook)).toEqual({ review: false, register: false });
    await act(async () => hook.current.onRegisterLeft());
    expect(shown(hook)).toEqual({ review: true, register: false });
  });
});

describe('registering', () => {
  it('hands over what was created and goes back to the review', async () => {
    mockCreate.mockResolvedValue(SUPPLIER);
    const hook = await mount();
    await openFilled(hook);

    await submit(hook);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vet Distribuidora' }),
    );
    expect(onCreated).toHaveBeenCalledWith(SUPPLIER);
    expect(shown(hook)).toEqual({ review: true, register: false });
    expect(hook.current.isSaving).toBe(false);
  });

  it('sends nothing while a field is wrong', async () => {
    const hook = await mount();
    await open(hook);

    await submit(hook);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(hook.current.form.errors.taxId).toBe('required');
  });

  it.each<[string, SaveResult, string | undefined]>([
    ['the CNPJ is repeated', DUPLICATED_TAX_ID, 'duplicated'],
    ['it could not be saved', null, undefined],
  ])('stays open when %s', async (_case, result, taxIdError) => {
    mockCreate.mockResolvedValue(result);
    const hook = await mount();
    await openFilled(hook);

    await submit(hook);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(hook.current.form.errors.taxId).toBe(taxIdError);
    expect(onCreated).not.toHaveBeenCalled();
    expect(shown(hook)).toEqual({ review: false, register: true });
    expect(hook.current.isSaving).toBe(false);
  });

  it('forgets an answer that arrives after it closed', async () => {
    let answer!: (value: SaveResult) => void;
    mockCreate.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const hook = await mount();
    await openFilled(hook);
    await act(async () => {
      hook.current.submit();
    });
    hook.unmount();

    await act(async () => answer(SUPPLIER));

    expect(onCreated).not.toHaveBeenCalled();
  });
});

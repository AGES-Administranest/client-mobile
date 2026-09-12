import ReactTestRenderer, { act } from 'react-test-renderer';

import { sessionStore } from 'shared/services/sessionStore';

import { useMaterialsScreen } from './useMaterialsScreen';
import type { BackendItem } from '../domain/materialsFilter';
import { createItemLot } from '../services/itemLotService';
import {
  createItem,
  deleteItem,
  fetchItems,
  updateItem,
} from '../services/itemService';

jest.mock('../services/itemService', () => ({
  fetchItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));
jest.mock('../services/itemLotService', () => ({
  createItemLot: jest.fn(),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;
const createItemMock = createItem as jest.MockedFunction<typeof createItem>;
const updateItemMock = updateItem as jest.MockedFunction<typeof updateItem>;
const deleteItemMock = deleteItem as jest.MockedFunction<typeof deleteItem>;
const createItemLotMock = createItemLot as jest.MockedFunction<
  typeof createItemLot
>;

const USER_ID = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607';

const EXISTING: BackendItem = {
  id: 'item-1',
  supplierId: null,
  category: 'MEDICATION',
  unit: 'AMPOULE',
  name: 'Dipirona 500mg',
  defaultUnitCost: '12.5000',
  minimumStock: '10.000',
  currentQuantity: '25.000',
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

const baseDraft = {
  category: 'MEDICATION',
  name: 'Dipirona 500mg',
  selectedItemId: null as string | null,
  unitCost: '12,50',
  unit: 'ampola',
  quantity: '5',
  minQuantity: null as string | null,
  expiration: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStore.set({ userId: USER_ID, idToken: 'token' });
  fetchItemsMock.mockResolvedValue([EXISTING]);
  createItemMock.mockResolvedValue({ ...EXISTING, id: 'item-new' });
  updateItemMock.mockResolvedValue(EXISTING);
  deleteItemMock.mockResolvedValue({ id: 'item-1', name: EXISTING.name });
  createItemLotMock.mockResolvedValue({} as never);
});

// O repo testa com react-test-renderer puro; um harness minimo expoe o
// retorno do hook sem puxar uma dependencia nova.
async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useMaterialsScreen>,
  };

  function Harness() {
    result.current = useMaterialsScreen();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(<Harness />);
  });

  return { result };
}

test('editing an existing item updates it instead of creating a duplicate', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({
      ...baseDraft,
      editingItemId: 'item-1',
      name: 'Dipirona 1g',
      quantity: '',
    } as never);
  });

  expect(updateItemMock).toHaveBeenCalledWith(
    'item-1',
    expect.objectContaining({ name: 'Dipirona 1g' }),
  );
  expect(createItemMock).not.toHaveBeenCalled();
});

test('editing persists the minimum stock the form shows', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({
      ...baseDraft,
      editingItemId: 'item-1',
      minQuantity: '15',
      quantity: '',
    } as never);
  });

  expect(updateItemMock).toHaveBeenCalledWith(
    'item-1',
    expect.objectContaining({ minimumStock: 15 }),
  );
});

test('creating an item without initial stock does not post a zero-quantity lot', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({ ...baseDraft, quantity: '' } as never);
  });

  expect(createItemMock).toHaveBeenCalled();
  // CreateItemLotDto exige @IsPositive() em quantity: 0 devolve 400.
  expect(createItemLotMock).not.toHaveBeenCalled();
});

test('adding stock to an item already in the list creates a lot, not an item', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({
      ...baseDraft,
      selectedItemId: 'item-1',
      quantity: '7',
    } as never);
  });

  expect(createItemMock).not.toHaveBeenCalled();
  expect(createItemLotMock).toHaveBeenCalledWith(
    'item-1',
    expect.objectContaining({ quantity: 7 }),
  );
});

test('deleting an item removes it from the list', async () => {
  const { result } = await mountHook();
  expect(result.current.items).toHaveLength(1);

  await act(async () => {
    await result.current.onDeleteItem('item-1');
  });

  expect(deleteItemMock).toHaveBeenCalledWith('item-1');
  expect(result.current.items).toHaveLength(0);
});

test('sends the expiration the user typed as an ISO date', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({
      ...baseDraft,
      selectedItemId: 'item-1',
      quantity: '3',
      expiration: '31/03/2027',
    } as never);
  });

  expect(createItemLotMock).toHaveBeenCalledWith(
    'item-1',
    expect.objectContaining({ expirationDate: '2027-03-31' }),
  );
});

test('ignores an incomplete expiration instead of sending garbage', async () => {
  const { result } = await mountHook();

  await act(async () => {
    await result.current.onConfirmAdd({
      ...baseDraft,
      selectedItemId: 'item-1',
      quantity: '3',
      expiration: '31/03',
    } as never);
  });

  expect(createItemLotMock).toHaveBeenCalledWith(
    'item-1',
    expect.objectContaining({ expirationDate: undefined }),
  );
});

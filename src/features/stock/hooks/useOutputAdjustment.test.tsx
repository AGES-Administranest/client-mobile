import ReactTestRenderer, { act } from 'react-test-renderer';

import { useOutputAdjustment } from './useOutputAdjustment';
import {
  createOutputAdjustment,
  fetchAdjustableItems,
  StockAdjustmentError,
} from '../services/stockAdjustmentService';

jest.mock('../services/stockAdjustmentService', () => {
  const actual = jest.requireActual('../services/stockAdjustmentService');

  return {
    ...actual,
    fetchAdjustableItems: jest.fn(),
    createOutputAdjustment: jest.fn(),
  };
});

const fetchMock = fetchAdjustableItems as jest.MockedFunction<
  typeof fetchAdjustableItems
>;
const createMock = createOutputAdjustment as jest.MockedFunction<
  typeof createOutputAdjustment
>;

const ITEMS = [
  {
    id: 'item-1',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule' as const,
    availableQuantity: 8,
  },
];

let current: ReturnType<typeof useOutputAdjustment>;

function Probe() {
  current = useOutputAdjustment();
  return null;
}

async function mount() {
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(ITEMS);
  createMock.mockReset().mockResolvedValue(undefined);
});

test('loads the items that can be adjusted', async () => {
  await mount();

  expect(current.items[0].name).toBe('Propofol 10mg/ml 20ml');
});

test('strips anything that is not a digit from the quantity', async () => {
  await mount();

  await act(async () => current.setQuantity('1a2,5'));

  expect(current.draft.quantity).toBe('125');
});

test('refuses to save an incomplete form and reports which fields failed', async () => {
  await mount();

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(false);
  expect(createMock).not.toHaveBeenCalled();
  expect(current.errors).toEqual({
    itemId: 'required',
    quantity: 'required',
    reason: 'required',
  });
});

test('asks for the written reason only when "other" is picked', async () => {
  await mount();

  await act(async () => current.setReason('breakage'));
  expect(current.needsWrittenReason).toBe(false);

  await act(async () => current.setReason('other'));
  expect(current.needsWrittenReason).toBe(true);
});

test('drops a written reason that is no longer needed', async () => {
  await mount();

  await act(async () => current.setReason('other'));
  await act(async () => current.setOtherReason('Frasco trocado'));
  await act(async () => current.setReason('loss'));

  expect(current.draft.otherReason).toBe('');
});

test('saves a valid adjustment and reports success', async () => {
  await mount();

  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('2'));
  await act(async () => current.setReason('loss'));

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(true);
  expect(current.failure).toBeNull();
  expect(createMock).toHaveBeenCalledWith({
    itemId: 'item-1',
    quantity: 2,
    reason: 'loss',
    notes: null,
  });
});

test('sends the written reason as the note when "other" is picked', async () => {
  await mount();

  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('1'));
  await act(async () => current.setReason('other'));
  await act(async () => current.setOtherReason('  Frasco trocado  '));

  await act(async () => {
    await current.submit();
  });

  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'other', notes: 'Frasco trocado' }),
  );
});

test('surfaces the business error with the data needed to explain it', async () => {
  createMock.mockRejectedValueOnce(
    new StockAdjustmentError('Insufficient stock', 'INSUFFICIENT_STOCK', {
      available: 8,
    }),
  );

  await mount();

  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('50'));
  await act(async () => current.setReason('loss'));

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(false);
  expect(current.failure).toEqual({
    code: 'INSUFFICIENT_STOCK',
    params: { available: 8 },
  });
  expect(current.isSaving).toBe(false);
});

test('falls back to an unknown failure for an unexpected error', async () => {
  createMock.mockRejectedValueOnce(new Error('boom'));

  await mount();

  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('1'));
  await act(async () => current.setReason('loss'));

  await act(async () => {
    await current.submit();
  });

  expect(current.failure?.code).toBe('UNKNOWN');
});

test('clears the form and the failure on reset', async () => {
  createMock.mockRejectedValueOnce(
    new StockAdjustmentError('Insufficient stock', 'INSUFFICIENT_STOCK'),
  );

  await mount();

  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('50'));
  await act(async () => current.setReason('loss'));

  await act(async () => {
    await current.submit();
  });

  expect(current.failure).not.toBeNull();

  await act(async () => current.reset());

  expect(current.draft).toEqual({
    itemId: null,
    quantity: '',
    reason: null,
    otherReason: '',
  });
  expect(current.failure).toBeNull();
  expect(current.errors).toEqual({});
});

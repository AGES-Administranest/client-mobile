import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useOutputAdjustment } from './useOutputAdjustment';
import { loadPendingMovements } from '../services/pendingMovementsRepository';
import { fetchAdjustableItems } from '../services/stockAdjustmentService';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

jest.mock('../services/stockAdjustmentService', () => ({
  ...jest.requireActual('../services/stockAdjustmentService'),
  fetchAdjustableItems: jest.fn(),
}));

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchAdjustableItems as jest.MockedFunction<
  typeof fetchAdjustableItems
>;

const USER = 'user-1';

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: USER,
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const ITEMS = [
  {
    id: 'item-1',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule' as const,
    availableQuantity: 8,
    unitCost: 19.9,
  },
];

let current: ReturnType<typeof useOutputAdjustment>;

function Probe() {
  current = useOutputAdjustment();
  return null;
}

async function mount() {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
}

async function fillValidDraft() {
  await act(async () => current.setItemId('item-1'));
  await act(async () => current.setQuantity('2'));
  await act(async () => current.setReason('loss'));
}

async function queued() {
  return loadPendingMovements(USER);
}

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  fetchMock.mockResolvedValue(ITEMS);
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
  expect(await queued()).toEqual([]);
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

test('queues a valid adjustment and reports success', async () => {
  await mount();
  await fillValidDraft();

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(true);
  expect(current.failure).toBeNull();
  expect(await queued()).toEqual([
    expect.objectContaining({
      itemId: 'item-1',
      itemName: 'Propofol 10mg/ml 20ml',
      unit: 'ampoule',
      type: 'outbound',
      source: 'manualAdjustment',
      adjustmentReason: 'loss',
      quantity: 2,
      unitCost: 19.9,
      notes: null,
    }),
  ]);
});

test('gives every queued adjustment its own id', async () => {
  await mount();

  await fillValidDraft();
  await act(async () => {
    await current.submit();
  });

  await fillValidDraft();
  await act(async () => {
    await current.submit();
  });

  const ids = (await queued()).map(movement => movement.id);

  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/i);
});

test('stamps the adjustment with the moment the user saved it', async () => {
  await mount();
  await fillValidDraft();

  const before = Date.now();
  await act(async () => {
    await current.submit();
  });
  const after = Date.now();

  const [movement] = await queued();
  const stamped = new Date(movement.occurredAt).getTime();

  expect(stamped).toBeGreaterThanOrEqual(before);
  expect(stamped).toBeLessThanOrEqual(after);
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

  expect(await queued()).toEqual([
    expect.objectContaining({
      adjustmentReason: 'other',
      notes: 'Frasco trocado',
    }),
  ]);
});

test('reports a failure when the queue could not be written', async () => {
  const AsyncStorage = jest.requireMock(
    '@react-native-async-storage/async-storage',
  ).default;

  AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));

  await mount();
  await fillValidDraft();

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(false);
  expect(current.failure).toEqual({ code: 'QUEUE_WRITE_FAILED', params: {} });
  expect(current.isSaving).toBe(false);
});

test('refuses an item with no unit cost, which the sync would never accept', async () => {
  fetchMock.mockResolvedValue([{ ...ITEMS[0], unitCost: 0 }]);

  await mount();
  await fillValidDraft();

  let saved: boolean | undefined;
  await act(async () => {
    saved = await current.submit();
  });

  expect(saved).toBe(false);
  expect(current.failure).toEqual({ code: 'NO_UNIT_COST', params: {} });
  expect(await queued()).toEqual([]);
});

test('clears the form and the failure on reset', async () => {
  const AsyncStorage = jest.requireMock(
    '@react-native-async-storage/async-storage',
  ).default;

  AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));

  await mount();
  await fillValidDraft();

  await act(async () => {
    await current.submit();
  });

  expect(current.failure).not.toBeNull();

  await act(async () => current.reset());

  expect(current.failure).toBeNull();
  expect(current.draft).toEqual({
    itemId: null,
    quantity: '',
    reason: null,
    otherReason: '',
  });
});

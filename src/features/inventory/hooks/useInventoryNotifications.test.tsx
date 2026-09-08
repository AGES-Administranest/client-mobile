import ReactTestRenderer from 'react-test-renderer';

import { useInventoryNotifications } from './useInventoryNotifications';
import type { IsoDate } from '../domain/expiryAlert';
import {
  expiryKey,
  InventoryItem,
  InventoryNotification,
  lowStockKey,
} from '../domain/inventoryNotifications';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
  },
}));

const NOW = new Date(2026, 8, 13, 10, 0);

function item(
  id: string,
  { quantity = 50, minimumStock = 10, expiresInDays = 400 } = {},
): InventoryItem {
  const expiration = new Date(NOW);
  expiration.setDate(expiration.getDate() + expiresInDays);

  const month = String(expiration.getMonth() + 1).padStart(2, '0');
  const day = String(expiration.getDate()).padStart(2, '0');

  return {
    id,
    name: id,
    unit: 'frasco',
    quantity,
    minimumStock,
    expirationDate: `${expiration.getFullYear()}-${month}-${day}` as IsoDate,
  };
}

let state: {
  notifications: InventoryNotification[];
  dismiss: (key: string) => void;
};

function Probe({ items }: { items: InventoryItem[] }) {
  state = useInventoryNotifications(items, NOW);
  return null;
}

async function mount(initialItems: InventoryItem[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe items={initialItems} />);
  });

  return async (nextItems: InventoryItem[]) => {
    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe items={nextItems} />);
    });
  };
}

async function act(fn: () => void) {
  await ReactTestRenderer.act(async () => {
    fn();
  });
}

beforeEach(() => {
  mockStorage.clear();
});

it('lista um card por alerta', async () => {
  await mount([
    item('cetamina', { quantity: 3, minimumStock: 5 }),
    item('dipirona', { expiresInDays: 5 }),
  ]);

  expect(state.notifications.map(n => n.kind).sort()).toEqual([
    'expiry',
    'lowStock',
  ]);
});

it('remove o alerta apagado pelo usuário', async () => {
  await mount([item('cetamina', { quantity: 3, minimumStock: 5 })]);

  await act(() => state.dismiss(lowStockKey('cetamina')));

  expect(state.notifications).toEqual([]);
});

it('apaga só o alerta arrastado, não o outro do mesmo item', async () => {
  await mount([item('propofol', { quantity: 1, expiresInDays: 2 })]);
  expect(state.notifications).toHaveLength(2);

  await act(() => state.dismiss(expiryKey('propofol')));

  expect(state.notifications).toHaveLength(1);
  expect(state.notifications[0].kind).toBe('lowStock');
});

it('mantém apagado depois de reabrir a tela', async () => {
  await mount([item('cetamina', { quantity: 3, minimumStock: 5 })]);
  await act(() => state.dismiss(lowStockKey('cetamina')));

  await mount([item('cetamina', { quantity: 3, minimumStock: 5 })]);

  expect(state.notifications).toEqual([]);
});

// O rearme: repor o estoque e deixar cair de novo traz o alerta de volta.
it('mostra de novo quando o item sai e reentra em alerta', async () => {
  const update = await mount([
    item('cetamina', { quantity: 3, minimumStock: 5 }),
  ]);
  await act(() => state.dismiss(lowStockKey('cetamina')));
  expect(state.notifications).toEqual([]);

  await update([item('cetamina', { quantity: 30, minimumStock: 5 })]);
  await update([item('cetamina', { quantity: 2, minimumStock: 5 })]);

  expect(state.notifications).toHaveLength(1);
});

it('avança o "há X min" sozinho com a tela aberta', async () => {
  jest.useFakeTimers();

  const stale = { [lowStockKey('cetamina')]: Date.now() - 5 * 60 * 1000 };
  mockStorage.set(
    '@administranest:inventory:alert-timestamps',
    JSON.stringify(stale),
  );

  // Sem referenceDate o relógio corre de verdade.
  function Live({ items }: { items: InventoryItem[] }) {
    state = useInventoryNotifications(items);
    return null;
  }

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <Live items={[item('cetamina', { quantity: 3, minimumStock: 5 })]} />,
    );
  });

  expect(state.notifications[0].elapsed).toEqual({ unit: 'minutes', value: 5 });

  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(3 * 60 * 1000);
  });

  expect(state.notifications[0].elapsed).toEqual({ unit: 'minutes', value: 8 });

  jest.useRealTimers();
});

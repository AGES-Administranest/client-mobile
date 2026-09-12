import ReactTestRenderer from 'react-test-renderer';

import { useInventoryNotifications } from './useInventoryNotifications';
import type { ExpiringLot } from '../domain/expiryAlert';
import {
  expiryKey,
  type InventoryNotification,
  lowStockKey,
} from '../domain/inventoryNotifications';
import type { MonitoredItem } from '../domain/lowStockAlert';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => mockStorage.set(key, value),
  },
}));

const NOW = new Date(2026, 8, 13, 10);
const item = (quantity = 2): MonitoredItem => ({
  id: 'propofol',
  name: 'Propofol',
  unit: 'frasco',
  quantity,
  minimumStock: 5,
});
const lot = (
  id = 'lote-a',
  expirationDate: ExpiringLot['expirationDate'] = '2026-09-15',
): ExpiringLot => ({
  id,
  itemId: 'propofol',
  name: 'Propofol',
  expirationDate,
});

let state: {
  notifications: InventoryNotification[];
  dismiss: (key: string) => void;
};

function Probe({
  userId = 'ana',
  items = [item()],
  lots = [lot()],
  live = false,
}: {
  userId?: string;
  items?: MonitoredItem[];
  lots?: ExpiringLot[];
  live?: boolean;
}) {
  state = useInventoryNotifications(
    userId,
    items,
    lots,
    live ? undefined : NOW,
  );
  return null;
}

async function render(props = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe {...props} />);
  });
  return renderer!;
}

beforeEach(() => mockStorage.clear());

it('lista estoque e cada lote em cards independentes', async () => {
  await render({ lots: [lot('a'), lot('b', '2026-09-18')] });
  expect(state.notifications.map(alert => alert.key).sort()).toEqual([
    expiryKey('a'),
    expiryKey('b'),
    lowStockKey('propofol'),
  ]);
});

it('persiste a dispensa apenas para a conta atual', async () => {
  await render({ userId: 'ana', lots: [] });
  await ReactTestRenderer.act(async () =>
    state.dismiss(lowStockKey('propofol')),
  );
  await render({ userId: 'ana', lots: [] });
  expect(state.notifications).toEqual([]);
  await render({ userId: 'bia', lots: [] });
  expect(state.notifications).toHaveLength(1);
});

it('rearma depois que o item sai e volta ao estado crítico', async () => {
  const renderer = await render({ lots: [] });
  await ReactTestRenderer.act(async () =>
    state.dismiss(lowStockKey('propofol')),
  );
  await ReactTestRenderer.act(async () => {
    renderer.update(<Probe lots={[]} items={[item(20)]} />);
  });
  await ReactTestRenderer.act(async () => {
    renderer.update(<Probe lots={[]} items={[item(1)]} />);
  });
  expect(state.notifications).toHaveLength(1);
});

it('atualiza a janela de validade com a tela aberta', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 12, 23, 59));
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  try {
    renderer = await render({
      live: true,
      items: [item(20)],
      lots: [lot('a', '2026-09-20')],
    });
    expect(state.notifications).toHaveLength(0);
    await ReactTestRenderer.act(async () => jest.advanceTimersByTime(60000));
    expect(state.notifications).toHaveLength(1);
  } finally {
    await ReactTestRenderer.act(async () => renderer?.unmount());
    jest.useRealTimers();
  }
});

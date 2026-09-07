import ReactTestRenderer from 'react-test-renderer';

import { useExpiryAlert } from './useExpiryAlert';
import { ExpiringItem } from '../domain/expiryAlert';

const mockScheduleNotification = jest.fn(
  async (_input: { title: string; body?: string }) => 'notification-id',
);
const mockStorage = new Map<string, string>();

jest.mock('shared/services', () => ({
  scheduleNotification: (input: { title: string; body?: string }) =>
    mockScheduleNotification(input),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
  },
}));

const translate = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const referenceDate = new Date(2026, 8, 6, 12);

function item(id: string, daysFromToday: number): ExpiringItem {
  const expirationDate = new Date(referenceDate);
  expirationDate.setDate(expirationDate.getDate() + daysFromToday);

  return {
    id,
    name: id,
    expirationDate: expirationDate.toISOString().slice(0, 10),
  };
}

function Probe({ items }: { items: ExpiringItem[] }) {
  useExpiryAlert(items, translate, referenceDate);
  return null;
}

async function mount(initialItems: ExpiringItem[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe items={initialItems} />);
  });

  return async (nextItems: ExpiringItem[]) => {
    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe items={nextItems} />);
    });
  };
}

beforeEach(() => {
  mockStorage.clear();
  mockScheduleNotification.mockClear();
});

it('notifica um item dentro da janela de validade', async () => {
  await mount([item('propofol', 10)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
  expect(mockScheduleNotification.mock.calls[0][0].body).toContain('propofol');
});

it('não notifica itens fora da janela', async () => {
  await mount([item('propofol', 31)]);

  expect(mockScheduleNotification).not.toHaveBeenCalled();
});

it('não repete a notificação enquanto o item continua na janela', async () => {
  const update = await mount([item('propofol', 10)]);
  mockScheduleNotification.mockClear();

  await update([item('propofol', 5)]);

  expect(mockScheduleNotification).not.toHaveBeenCalled();
});

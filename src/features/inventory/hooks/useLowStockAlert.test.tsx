import ReactTestRenderer from 'react-test-renderer';

import { useLowStockAlert } from './useLowStockAlert';
import { MonitoredItem } from '../domain/lowStockAlert';

// O prefixo `mock` é a exceção que o jest permite referenciar de dentro da
// factory de jest.mock, que é içada para o topo do arquivo.
const mockScheduleNotification = jest.fn(
  async (_input: { title: string; body?: string }) => 'notification-id',
);
const mockStorage = new Map<string, string>();

jest.mock('shared/services', () => ({
  scheduleNotification: (input: { title: string; body?: string }) =>
    mockScheduleNotification(input),
  initNotifications: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStorage.delete(key);
    },
  },
}));

const translate = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function item(id: string, quantity: number, minimum = 5): MonitoredItem {
  return { id, name: id, unit: 'frasco', quantity, minimumStock: minimum };
}

function Probe({ items }: { items: MonitoredItem[] }) {
  useLowStockAlert(items, translate);
  return null;
}

/** Monta o hook e devolve um `update` que simula uma nova lista de itens. */
async function mount(initialItems: MonitoredItem[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe items={initialItems} />);
  });

  return async (nextItems: MonitoredItem[]) => {
    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe items={nextItems} />);
    });
  };
}

function titles() {
  return mockScheduleNotification.mock.calls.map(([input]) => input.title);
}

function bodies() {
  return mockScheduleNotification.mock.calls.map(([input]) => input.body ?? '');
}

beforeEach(() => {
  mockStorage.clear();
  mockScheduleNotification.mockClear();
});

it('não notifica quando todos os itens estão acima do mínimo', async () => {
  await mount([item('propofol', 20), item('cetamina', 10)]);

  expect(mockScheduleNotification).not.toHaveBeenCalled();
});

it('notifica na montagem os itens que já estão abaixo do mínimo', async () => {
  await mount([item('propofol', 2)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
  expect(titles()[0]).toContain('inventory.alert.titleSingular');
  expect(bodies()[0]).toContain('propofol');
});

it('notifica quando uma baixa faz o item atingir o mínimo', async () => {
  const update = await mount([item('propofol', 6)]);
  mockScheduleNotification.mockClear();

  await update([item('propofol', 5)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
});

it('não repete a notificação em uma nova baixa do mesmo item', async () => {
  const update = await mount([item('propofol', 4)]);
  mockScheduleNotification.mockClear();

  await update([item('propofol', 3)]);
  await update([item('propofol', 2)]);

  expect(mockScheduleNotification).not.toHaveBeenCalled();
});

it('rearma o alerta depois de repor e cair de novo', async () => {
  const update = await mount([item('propofol', 4)]);
  mockScheduleNotification.mockClear();

  await update([item('propofol', 30)]);
  await update([item('propofol', 4)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
});

it('agrupa em uma notificação só os itens que cruzam juntos', async () => {
  const update = await mount([item('propofol', 8), item('cetamina', 8)]);
  mockScheduleNotification.mockClear();

  await update([item('propofol', 2), item('cetamina', 1)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
  expect(titles()[0]).toContain('inventory.alert.titlePlural');
  expect(bodies()[0]).toContain('propofol');
  expect(bodies()[0]).toContain('cetamina');
});

it('não duplica alerta em atualizações seguidas e rápidas', async () => {
  const update = await mount([item('cateter', 12, 10)]);
  mockScheduleNotification.mockClear();

  // Um atendimento consome vários materiais: o item cruza o mínimo na
  // primeira atualização e não pode notificar de novo nas seguintes.
  await update([item('cateter', 10, 10)]);
  await update([item('cateter', 9, 10)]);
  await update([item('cateter', 8, 10)]);

  expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
});

it('persiste o estado de notificado entre montagens', async () => {
  await mount([item('propofol', 2)]);
  mockScheduleNotification.mockClear();

  await mount([item('propofol', 2)]);

  expect(mockScheduleNotification).not.toHaveBeenCalled();
});

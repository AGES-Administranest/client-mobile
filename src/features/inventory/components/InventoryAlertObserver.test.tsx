import ReactTestRenderer from 'react-test-renderer';

import {
  InventoryAlertObserver,
  type InventoryAlertSnapshot,
} from './InventoryAlertObserver';

const mockLowStock = jest.fn();
const mockExpiry = jest.fn();
const mockDeactivate = jest.fn(async (_userId: string) => undefined);

jest.mock('../hooks/useLowStockAlert', () => ({
  useLowStockAlert: (...args: unknown[]) => mockLowStock(...args),
}));
jest.mock('../hooks/useExpiryAlert', () => ({
  useExpiryAlert: (...args: unknown[]) => mockExpiry(...args),
}));
jest.mock('../services/deactivateInventoryAlerts', () => ({
  deactivateInventoryAlerts: (userId: string) => mockDeactivate(userId),
}));
jest.mock('shared/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const loading = (userId: string | null): InventoryAlertSnapshot => ({
  status: 'loading',
  userId,
});
const ready = (
  userId: string,
): Extract<InventoryAlertSnapshot, { status: 'ready' }> => ({
  status: 'ready',
  userId,
  items: [
    {
      id: 'propofol',
      name: 'Propofol',
      unit: 'frasco',
      quantity: 2,
      minimumStock: 5,
    },
  ],
  lots: [
    {
      id: 'lote-a',
      itemId: 'propofol',
      name: 'Propofol',
      expirationDate: '2026-09-15',
    },
  ],
});

beforeEach(() => {
  mockLowStock.mockClear();
  mockExpiry.mockClear();
  mockDeactivate.mockClear();
});

it('não interpreta carregamento como estoque vazio', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <InventoryAlertObserver snapshot={loading('ana')} />,
    );
  });

  expect(mockLowStock).not.toHaveBeenCalled();
  expect(mockExpiry).not.toHaveBeenCalled();
  expect(mockDeactivate).not.toHaveBeenCalled();
});

it('observa dados prontos sem depender da tela de notificações', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <InventoryAlertObserver snapshot={ready('ana')} />,
    );
  });

  expect(mockLowStock).toHaveBeenCalledWith(
    'ana',
    ready('ana').items,
    expect.any(Function),
  );
  expect(mockExpiry).toHaveBeenCalledWith(
    'ana',
    ready('ana').lots,
    expect.any(Function),
    undefined,
  );
});

it('mantém a agenda durante recarga da mesma conta e limpa ao trocar', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <InventoryAlertObserver snapshot={ready('ana')} />,
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer.update(<InventoryAlertObserver snapshot={loading('ana')} />);
  });
  expect(mockDeactivate).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    renderer.update(<InventoryAlertObserver snapshot={loading('bia')} />);
  });
  expect(mockDeactivate).toHaveBeenCalledWith('ana');
});

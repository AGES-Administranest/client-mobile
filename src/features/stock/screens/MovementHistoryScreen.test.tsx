import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { MovementHistoryScreen } from './MovementHistoryScreen';
import type { StockMovement } from '../domain/stockMovement';
import { fetchStockMovements } from '../services/stockMovementService';

jest.mock('../services/stockMovementService', () => ({
  fetchStockMovements: jest.fn(),
}));

const fetchMock = fetchStockMovements as jest.MockedFunction<
  typeof fetchStockMovements
>;

const APPOINTMENT_OUTBOUND: StockMovement = {
  id: 'movement-1',
  itemName: 'Propofol 10mg/ml 20ml',
  unit: 'ampoule',
  type: 'outbound',
  source: 'appointment',
  quantity: 2,
  unitCost: 19.9,
  occurredAt: '2026-08-12T09:30:00',
  appointment: { id: 'appointment-1', label: 'Orquiectomia — Mel' },
};

const PURCHASE_INBOUND: StockMovement = {
  id: 'movement-2',
  itemName: 'Seringa 60ml (cx 30un)',
  unit: 'box',
  type: 'inbound',
  source: 'manualPurchase',
  quantity: 1,
  unitCost: 145,
  occurredAt: '2026-09-05T14:00:00',
};

const EXPIRATION_ADJUSTMENT: StockMovement = {
  id: 'movement-3',
  itemName: 'Soro fisiológico 500ml',
  unit: 'unit',
  type: 'outbound',
  source: 'manualAdjustment',
  adjustmentReason: 'expiration',
  quantity: 3,
  unitCost: 8.9,
  occurredAt: '2026-08-29T17:20:00',
};

async function mount() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MovementHistoryScreen />
      </I18nProvider>,
    );
  });

  return renderer!;
}

function readTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  ).replace(/\u00a0/g, ' ');
}

async function renderScreen() {
  return readTexts(await mount());
}

beforeEach(() => fetchMock.mockReset());

test('lists inbounds, appointment outbounds and manual adjustments with date, value, quantity and origin', async () => {
  fetchMock.mockResolvedValue([
    APPOINTMENT_OUTBOUND,
    PURCHASE_INBOUND,
    EXPIRATION_ADJUSTMENT,
  ]);

  const texts = await renderScreen();

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('12 ago');
  expect(texts).toContain('Saída por atendimento');
  expect(texts).toContain('-R$ 39,80');
  expect(texts).toContain('2 ampolas');

  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).toContain('05 set');
  expect(texts).toContain('Compra manual');
  expect(texts).toContain('+R$ 145,00');
  expect(texts).toContain('1 caixa');

  expect(texts).toContain('Soro fisiológico 500ml');
  expect(texts).toContain('29 ago');
  expect(texts).toContain('Ajuste · Vencimento');
  expect(texts).toContain('-R$ 26,70');
  expect(texts).toContain('3 un');
});

test('shows the appointment link only on movements that came from an appointment', async () => {
  fetchMock.mockResolvedValue([APPOINTMENT_OUTBOUND, PURCHASE_INBOUND]);

  const texts = await renderScreen();

  expect(texts).toContain('Atendimento · Orquiectomia — Mel');
  expect(texts.match(/Atendimento · /g)).toHaveLength(1);
});

test('orders the history from the most recent movement', async () => {
  fetchMock.mockResolvedValue([
    APPOINTMENT_OUTBOUND,
    PURCHASE_INBOUND,
    EXPIRATION_ADJUSTMENT,
  ]);

  const texts = await renderScreen();

  expect(texts.indexOf('Seringa')).toBeLessThan(texts.indexOf('Soro'));
  expect(texts.indexOf('Soro')).toBeLessThan(texts.indexOf('Propofol'));
});

test('shows the empty message when there is no movement yet', async () => {
  fetchMock.mockResolvedValue([]);

  const texts = await renderScreen();

  expect(texts).toContain('Nenhuma movimentação registrada.');
});

test('offers a retry when the history fails to load, and recovers on success', async () => {
  fetchMock.mockRejectedValueOnce(new Error('network down'));

  const renderer = await mount();

  expect(readTexts(renderer)).toContain(
    'Não foi possível carregar o histórico.',
  );

  fetchMock.mockResolvedValueOnce([PURCHASE_INBOUND]);

  const [retryButton] = renderer.root.findAll(
    node =>
      node.props.role === 'button' && typeof node.props.onPress === 'function',
  );

  await act(async () => {
    retryButton.props.onPress();
  });

  const texts = readTexts(renderer);

  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).not.toContain('Não foi possível carregar o histórico.');
});

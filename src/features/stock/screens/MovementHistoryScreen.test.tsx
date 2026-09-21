import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { MovementHistoryScreen } from './MovementHistoryScreen';
import type { StockMovement } from '../domain/stockMovement';
import { createOutputAdjustment } from '../services/stockAdjustmentService';
import { StockAdjustmentError } from '../services/stockAdjustmentService';
import { fetchStockMovements } from '../services/stockMovementService';

jest.mock('../services/stockMovementService', () => ({
  fetchStockMovements: jest.fn(),
}));

jest.mock('../services/stockAdjustmentService', () => {
  const actual = jest.requireActual('../services/stockAdjustmentService');

  return {
    ...actual,
    fetchAdjustableItems: jest.fn(() =>
      Promise.resolve([
        {
          id: 'item-1',
          name: 'Propofol 10mg/ml 20ml',
          unit: 'ampoule',
          availableQuantity: 8,
        },
      ]),
    ),
    createOutputAdjustment: jest.fn(() => Promise.resolve()),
  };
});

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

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  while (mounted.length > 0) {
    const renderer = mounted.pop();
    act(() => {
      renderer?.unmount();
    });
  }
});

async function mount(props: { savedMessageDurationMs?: number } = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MovementHistoryScreen {...props} />
      </I18nProvider>,
    );
  });

  mounted.push(renderer!);

  return renderer!;
}

function readTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  ).replace(/\u00a0/g, ' ');
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), ms);
    });
  });
}

async function renderScreen() {
  return readTexts(await mount());
}

function searchInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Buscar por item' &&
      typeof node.props.onChangeText === 'function',
  );
}

function periodToggle(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityState?.expanded !== undefined &&
      typeof node.props.onPress === 'function',
  );
}

function dayCell(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.find(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

function isCalendarOpen(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root.findAll(
      node =>
        typeof node.props.testID === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(node.props.testID),
    ).length > 0
  );
}

async function pickSingleDay(
  renderer: ReactTestRenderer.ReactTestRenderer,
  date: string,
) {
  await act(async () => {
    periodToggle(renderer).props.onPress();
  });

  await act(async () => {
    dayCell(renderer, date).props.onPress();
  });

  await act(async () => {
    dayCell(renderer, date).props.onPress();
  });
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

  const retryButton = renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === 'Tentar novamente'),
    )!;

  await act(async () => {
    retryButton.props.onPress();
  });

  const texts = readTexts(renderer);

  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).not.toContain('Não foi possível carregar o histórico.');
});

describe('filters', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue([
      APPOINTMENT_OUTBOUND,
      PURCHASE_INBOUND,
      EXPIRATION_ADJUSTMENT,
    ]);
  });

  it('filters by item name as the user types', async () => {
    const renderer = await mount();

    await act(async () => {
      searchInput(renderer).props.onChangeText('seringa');
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).not.toContain('Propofol');
    expect(texts).not.toContain('Soro');
  });

  it('ignores accents and case in the item search', async () => {
    const renderer = await mount();

    await act(async () => {
      searchInput(renderer).props.onChangeText('FISIOLOGICO');
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Soro fisiológico 500ml');
    expect(texts).not.toContain('Propofol');
  });

  it('returns only that day when the same day is picked as start and end', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    const texts = readTexts(renderer);

    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).not.toContain('Propofol');
    expect(texts).not.toContain('Soro');
  });

  it('returns every movement inside a multi-day period', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    await act(async () => {
      renderer.root
        .find(
          node =>
            node.props.accessibilityLabel === 'Mês anterior' &&
            typeof node.props.onPress === 'function',
        )
        .props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-08-12').props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-08-29').props.onPress();
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Propofol 10mg/ml 20ml');
    expect(texts).toContain('Soro fisiológico 500ml');
    expect(texts).not.toContain('Seringa');
  });

  it('combines the item and the period filters', async () => {
    const renderer = await mount();

    await act(async () => {
      searchInput(renderer).props.onChangeText('propofol');
    });

    await pickSingleDay(renderer, '2026-09-05');

    expect(readTexts(renderer)).toContain(
      'Nenhuma movimentação encontrada para o filtro.',
    );
  });

  it('tells the user nothing matched, not that there is no history', async () => {
    const renderer = await mount();

    await act(async () => {
      searchInput(renderer).props.onChangeText('cetamina');
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Nenhuma movimentação encontrada para o filtro.');
    expect(texts).not.toContain('Nenhuma movimentação registrada.');
  });

  it('restores the full history when the filters are cleared', async () => {
    const renderer = await mount();

    await act(async () => {
      searchInput(renderer).props.onChangeText('seringa');
    });

    expect(readTexts(renderer)).not.toContain('Propofol');

    await act(async () => {
      renderer.root
        .find(
          node =>
            node.props.accessibilityLabel === 'Limpar' &&
            typeof node.props.onPress === 'function',
        )
        .props.onPress();
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Propofol 10mg/ml 20ml');
    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).toContain('Soro fisiológico 500ml');
  });

  it('shows the picked period on the filter button', async () => {
    const renderer = await mount();

    expect(readTexts(renderer)).toContain('Período');

    await pickSingleDay(renderer, '2026-09-05');

    expect(readTexts(renderer)).toContain('05 set');
  });
});

describe('calendar visibility', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue([
      APPOINTMENT_OUTBOUND,
      PURCHASE_INBOUND,
      EXPIRATION_ADJUSTMENT,
    ]);
  });

  it('stays open while only the start of the period is picked', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);

    await act(async () => {
      dayCell(renderer, '2026-09-05').props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);
  });

  it('closes once start and end are both picked', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    expect(isCalendarOpen(renderer)).toBe(false);
    expect(readTexts(renderer)).toContain('05 set');
  });

  it('closes on a multi-day period too', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-09-01').props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-09-10').props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(false);
  });

  it('can be reopened to pick a different period', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);
  });
});

describe('output adjustment', () => {
  const createMock = createOutputAdjustment as jest.MockedFunction<
    typeof createOutputAdjustment
  >;

  beforeEach(() => {
    fetchMock.mockResolvedValue([PURCHASE_INBOUND]);
    createMock.mockReset().mockResolvedValue(undefined);
  });

  function pressableWithText(
    renderer: ReactTestRenderer.ReactTestRenderer,
    text: string,
  ) {
    return renderer.root
      .findAll(
        node =>
          (node.props.role === 'button' ||
            node.props.accessibilityRole === 'button') &&
          typeof node.props.onPress === 'function',
      )
      .find(node =>
        node
          .findAllByType('Text' as never)
          .some(label => label.props.children === text),
      )!;
  }

  function byLabel(
    renderer: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ) {
    return renderer.root.find(
      node =>
        node.props.accessibilityLabel === label &&
        (typeof node.props.onPress === 'function' ||
          typeof node.props.onChangeText === 'function'),
    );
  }

  async function fillValidAdjustment(
    renderer: ReactTestRenderer.ReactTestRenderer,
  ) {
    await act(async () => {
      pressableWithText(renderer, 'Novo lançamento').props.onPress();
    });

    await act(async () => {
      byLabel(renderer, 'Item').props.onPress();
    });

    await act(async () => {
      renderer.root
        .find(node => node.props.testID === 'item-option-item-1')
        .props.onPress();
    });

    await act(async () => {
      byLabel(renderer, 'Quantidade').props.onChangeText('2');
    });

    await act(async () => {
      byLabel(renderer, 'Perda').props.onPress();
    });
  }

  it('opens the adjustment form from the button above the title', async () => {
    const renderer = await mount();

    await act(async () => {
      pressableWithText(renderer, 'Novo lançamento').props.onPress();
    });

    expect(readTexts(renderer)).toContain('Registro de ajuste de saída');
  });

  it('shows the saved message and closes the form on success', async () => {
    const renderer = await mount();

    await fillValidAdjustment(renderer);

    await act(async () => {
      pressableWithText(renderer, 'Salvar').props.onPress();
    });

    expect(createMock).toHaveBeenCalledWith({
      itemId: 'item-1',
      quantity: 2,
      reason: 'loss',
      notes: null,
    });
    expect(readTexts(renderer)).toContain('Atualização salva');

    const modal = renderer.root.findAll(
      node => node.props.visible !== undefined && node.props.transparent,
    );

    expect(modal.every(node => node.props.visible === false)).toBe(true);
  });

  it('hides the saved message after a few seconds', async () => {
    const renderer = await mount({ savedMessageDurationMs: 200 });

    await fillValidAdjustment(renderer);

    await act(async () => {
      pressableWithText(renderer, 'Salvar').props.onPress();
    });

    expect(readTexts(renderer)).toContain('Atualização salva');

    await wait(600);

    expect(readTexts(renderer)).not.toContain('Atualização salva');
  });

  it('restarts the countdown when a second adjustment is saved', async () => {
    const renderer = await mount({ savedMessageDurationMs: 500 });

    await fillValidAdjustment(renderer);
    await act(async () => {
      pressableWithText(renderer, 'Salvar').props.onPress();
    });

    await wait(150);

    await fillValidAdjustment(renderer);
    await act(async () => {
      pressableWithText(renderer, 'Salvar').props.onPress();
    });

    await wait(200);

    expect(readTexts(renderer)).toContain('Atualização salva');

    await wait(900);

    expect(readTexts(renderer)).not.toContain('Atualização salva');
  });

  it('reports what went wrong and keeps the form open on failure', async () => {
    createMock.mockRejectedValueOnce(
      new StockAdjustmentError('Insufficient stock', 'INSUFFICIENT_STOCK', {
        available: 8,
      }),
    );

    const renderer = await mount();

    await fillValidAdjustment(renderer);

    await act(async () => {
      pressableWithText(renderer, 'Salvar').props.onPress();
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Quantidade maior que o saldo disponível (8).');
    expect(texts).not.toContain('Atualização salva');

    const modal = renderer.root.findAll(
      node => node.props.visible !== undefined && node.props.transparent,
    );

    expect(modal.some(node => node.props.visible === true)).toBe(true);
  });
});

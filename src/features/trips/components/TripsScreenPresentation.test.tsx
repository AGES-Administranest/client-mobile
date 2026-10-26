import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { TripsScreenPresentation } from './TripsScreenPresentation';
import type { Trip } from '../domain/trip.types';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const TEXTS = {
  title: 'Deslocamentos',
  subtitle: 'Quanto você rodou e gastou para atender',
  back: 'Voltar',
  add: 'Registrar deslocamento',
  loading: 'Carregando',
  emptyTitle: 'Nenhum deslocamento em outubro',
  emptyMessage: 'Registre as idas às clínicas.',
  loadFailed: 'Não foi possível carregar os deslocamentos.',
  retry: 'Tentar novamente',
  summary: {
    monthLabel: 'Outubro 2026',
    currentMonth: 'MÊS ATUAL',
    previousMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    costInMonth: 'CUSTO NO MÊS',
    kmDriven: 'KM RODADOS',
    tripsCount: 'DESLOCAMENTOS',
    totalCost: 'R$ 238,74',
    totalKm: '412,5 km',
    count: '12',
  },
};

const TRIP = { id: 'trip-1', origin: 'Casa', destination: 'Clínica' } as Trip;

const GROUPS = [
  {
    date: '2026-10-18',
    label: 'Sáb, 18 out',
    rows: [
      {
        trip: TRIP,
        texts: {
          subtitle: 'Fiat Strada · 30 km',
          cost: 'R$ 14,16',
          pending: 'pendente',
          delete: 'Excluir',
        },
      },
    ],
  },
];

async function render(
  overrides: Partial<ComponentProps<typeof TripsScreenPresentation>> = {},
) {
  const props = {
    texts: TEXTS,
    isCurrentMonth: true,
    onPreviousMonth: jest.fn(),
    onNextMonth: jest.fn(),
    groups: GROUPS,
    isLoading: false,
    hasError: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: jest.fn(),
    onRefresh: jest.fn(),
    onTripPress: jest.fn(),
    onAddTrip: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TripsScreenPresentation {...props} />
      </SafeAreaProvider>,
    );
  });
  return { renderer, props };
}

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType('Text' as never).map(node => node.props.children);

// The floating button carries its label for screen readers; the pills inside
// the cards are found by their text.
const floatingButtons = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Registrar deslocamento' &&
      typeof node.props.onPress === 'function',
  );

const pressableWithText = (
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) =>
  renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === label),
  );

test('lists the trips of the day under the month totals, with the floating button', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining(['R$ 238,74', 'Sáb, 18 out', 'R$ 14,16']),
  );
  expect(floatingButtons(renderer).length).toBeGreaterThan(0);
});

test('loading draws the skeleton in place of the values and keeps the button', async () => {
  const { renderer } = await render({ groups: [], isLoading: true });

  expect(textsOf(renderer)).not.toContain('R$ 238,74');
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Carregando',
    ).length,
  ).toBeGreaterThan(0);
  expect(floatingButtons(renderer).length).toBeGreaterThan(0);
});

test('an empty month offers the register action inside the card, with no floating button', async () => {
  const { renderer, props } = await render({ groups: [] });

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Nenhum deslocamento em outubro',
      'Registre as idas às clínicas.',
    ]),
  );
  expect(floatingButtons(renderer)).toHaveLength(0);
  await act(async () =>
    pressableWithText(renderer, 'Registrar deslocamento').props.onPress(),
  );
  expect(props.onAddTrip).toHaveBeenCalledTimes(1);
});

test('a failed load shows dashes, the message and a retry', async () => {
  const { renderer, props } = await render({ groups: [], hasError: true });

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'R$ —',
      '— km',
      '—',
      'Não foi possível carregar os deslocamentos.',
    ]),
  );
  await act(async () =>
    pressableWithText(renderer, 'Tentar novamente').props.onPress(),
  );
  expect(props.onRefresh).toHaveBeenCalledTimes(1);
  expect(floatingButtons(renderer).length).toBeGreaterThan(0);
});

test('the next month stays disabled on the current month', async () => {
  const { renderer } = await render();

  const next = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Próximo mês' &&
      typeof node.props.onPress === 'function',
  );
  expect(next.props.disabled).toBe(true);
});

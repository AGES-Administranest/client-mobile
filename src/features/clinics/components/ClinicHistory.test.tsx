import { AccessibilityInfo, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ClinicHistory, type ClinicHistoryProps } from './ClinicHistory';

const PROPS: ClinicHistoryProps = {
  texts: {
    billed: 'Faturado',
    appointments: 'Atendimentos',
    trips: 'Deslocamento',
    listTitle: 'Atendimentos no período',
    loading: 'Carregando o histórico',
    loadingMore: 'Carregando mais atendimentos…',
    emptyTitle: 'Nenhum atendimento neste período',
    emptyMessage: 'Os atendimentos vinculados a esta clínica aparecem aqui.',
    retry: 'Tentar novamente',
  },
  status: 'ready',
  failureMessage: null,
  totals: {
    billed: 'R$ 3.420',
    appointments: '6',
    tripCost: 'R$ 96',
    tripCount: '6 trechos no período',
  },
  rows: [
    {
      id: 'a',
      title: 'Orquiectomia',
      detail: 'Mel · 17 ago',
      amount: 'R$ 620',
    },
    {
      id: 'b',
      title: 'Ovariohisterectomia',
      detail: 'Luna · 12 ago',
      amount: 'R$ 780',
    },
  ],
  showMoreLabel: 'Ver mais 2 atendimentos',
  isLoadingMore: false,
  periodField: <Text>01/08/2026 – 31/08/2026</Text>,
  onShowMore: () => undefined,
  onRetry: () => undefined,
};

async function render(overrides: Partial<ClinicHistoryProps> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <ClinicHistory {...PROPS} {...overrides} />,
    );
  });

  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function buttonWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  return renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === text),
  );
}

test('shows the totals and the appointments of the period', async () => {
  const renderer = await render();
  const shown = textsOf(renderer);

  for (const text of [
    '01/08/2026 – 31/08/2026',
    'R$ 3.420',
    '6',
    'R$ 96',
    '6 trechos no período',
    'Atendimentos no período',
    'Orquiectomia',
    'Mel · 17 ago',
    'R$ 780',
  ]) {
    expect(shown).toContain(text);
  }
});

test('asks for the next page from "Ver mais"', async () => {
  const onShowMore = jest.fn();
  const renderer = await render({ onShowMore });

  await act(() =>
    buttonWithText(renderer, 'Ver mais 2 atendimentos').props.onPress(),
  );

  expect(onShowMore).toHaveBeenCalledTimes(1);
});

test('hides "Ver mais" when the whole period is on screen', async () => {
  const renderer = await render({ showMoreLabel: null });

  expect(textsOf(renderer).some(text => text.startsWith('Ver mais'))).toBe(
    false,
  );
});

test('blocks "Ver mais" while the next page is loading', async () => {
  const renderer = await render({ isLoadingMore: true });

  const button = buttonWithText(renderer, 'Carregando mais atendimentos…');
  expect(button.props.disabled).toBe(true);
});

test('keeps the labels and draws bars while loading', async () => {
  const renderer = await render({ status: 'loading' });
  const shown = textsOf(renderer);

  expect(shown).toContain('Faturado');
  expect(shown).not.toContain('R$ 3.420');
  expect(shown).not.toContain('Orquiectomia');
  expect(
    renderer.root.findAll(
      node =>
        node.props.accessibilityRole === 'progressbar' &&
        node.props.accessibilityLabel === 'Carregando o histórico',
    ).length,
  ).toBeGreaterThan(0);
});

test('explains an empty period under the zeroed totals', async () => {
  const renderer = await render({
    rows: [],
    showMoreLabel: null,
    totals: {
      billed: 'R$ 0',
      appointments: '0',
      tripCost: 'R$ 0',
      tripCount: 'Nenhum trecho no período',
    },
  });
  const shown = textsOf(renderer);

  expect(shown).toContain('R$ 0');
  expect(shown).toContain('Nenhum trecho no período');
  expect(shown).toContain('Nenhum atendimento neste período');
});

test('drops the totals, announces the failure and retries', async () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => undefined);
  const onRetry = jest.fn();
  const message = 'Não foi possível carregar o histórico.';

  try {
    const renderer = await render({
      status: 'failed',
      failureMessage: message,
      onRetry,
    });
    const shown = textsOf(renderer);

    expect(shown).toContain(message);
    expect(shown).toContain('01/08/2026 – 31/08/2026');
    expect(shown).not.toContain('Faturado');
    expect(announce).toHaveBeenCalledWith(message);

    await act(() =>
      buttonWithText(renderer, 'Tentar novamente').props.onPress(),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  } finally {
    announce.mockRestore();
  }
});

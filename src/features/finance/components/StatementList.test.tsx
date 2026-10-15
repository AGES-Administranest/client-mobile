import { Plus } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import {
  StatementList,
  type StatementItem,
  type StatementTexts,
} from './StatementList';

const TEXTS: StatementTexts = {
  loading: 'Carregando lançamentos…',
  loadingMore: 'Carregando mais lançamentos…',
  automatic: 'automático',
  retry: 'Tentar novamente',
  loadMoreFailure: 'Não foi possível carregar mais lançamentos.',
  empty: {
    title: 'Nenhum lançamento neste mês',
    description: 'Registre uma entrada ou saída para acompanhar o seu saldo.',
    action: 'Novo lançamento',
  },
};

const ITEMS: StatementItem[] = [
  {
    id: 'entry-1',
    nature: 'INCOME',
    description: 'Orquiectomia – Mel',
    date: '17 ago',
    category: 'Honorários',
    amount: '+R$ 620',
    isAutomatic: true,
  },
  {
    id: 'entry-2',
    nature: 'EXPENSE',
    description: 'Seringa 60ml (cx 30un)',
    date: '16 ago',
    category: 'Insumos',
    amount: '–R$ 145',
    isAutomatic: false,
  },
];

type Props = React.ComponentProps<typeof StatementList>;

async function render(overrides: Partial<Props> = {}) {
  const props: Props = {
    items: ITEMS,
    status: 'ready',
    isLoadingMore: false,
    texts: TEXTS,
    failureMessage: null,
    noResultsMessage: null,
    onRetry: jest.fn(),
    onCreatePress: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<StatementList {...props} />);
  });
  return { renderer, props };
}

// O Pressable aparece duas vezes na árvore (o componente e o View nativo):
// o nativo não tem onPress.
const buttons = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    node =>
      (node.props.accessibilityRole === 'button' ||
        node.props.role === 'button') &&
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string',
  );

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter((child): child is string => typeof child === 'string');

test('lists each entry with its date, category and signed amount', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toEqual([
    'Orquiectomia – Mel',
    '17 ago',
    'Honorários',
    '+R$ 620',
    'automático',
    'Seringa 60ml (cx 30un)',
    '16 ago',
    'Insumos',
    '–R$ 145',
  ]);
});

test('rows open the entry only when the screen asks for it', async () => {
  const silent = await render();
  expect(buttons(silent.renderer)).toHaveLength(0);

  const onItemPress = jest.fn();
  const { renderer } = await render({ onItemPress });
  const rows = buttons(renderer);
  expect(rows).toHaveLength(2);

  await act(async () => rows[1].props.onPress());

  expect(onItemPress).toHaveBeenCalledWith('entry-2');
});

test('while loading, a screen reader hears what is on its way and nothing else', async () => {
  const { renderer } = await render({ status: 'loading', items: [] });

  expect(textsOf(renderer)).toEqual([]);
  expect(
    renderer.root.findAll(
      node =>
        node.props.accessibilityRole === 'progressbar' &&
        node.props.accessibilityLabel === TEXTS.loading,
    ).length,
  ).toBeGreaterThan(0);
});

test('a failure shows why, and the retry button reloads', async () => {
  const { renderer, props } = await render({
    status: 'failed',
    items: [],
    failureMessage: 'Não foi possível carregar os lançamentos.',
  });

  expect(textsOf(renderer)).toEqual([
    'Não foi possível carregar os lançamentos.',
    'Tentar novamente',
  ]);

  await act(async () => buttons(renderer)[0].props.onPress());

  expect(props.onRetry).toHaveBeenCalledTimes(1);
});

test('an empty month invites the first entry', async () => {
  const { renderer, props } = await render({ items: [] });

  expect(textsOf(renderer)).toEqual([
    'Nenhum lançamento neste mês',
    'Registre uma entrada ou saída para acompanhar o seu saldo.',
    'Novo lançamento',
  ]);
  expect(
    renderer.root.findAllByType(Icon).some(node => node.props.as === Plus),
  ).toBe(true);

  await act(async () => buttons(renderer)[0].props.onPress());

  expect(props.onCreatePress).toHaveBeenCalledTimes(1);
});

test('a filter with no match says so instead of inviting the first entry', async () => {
  const { renderer } = await render({
    items: [],
    noResultsMessage: 'Nenhum lançamento pessoal neste mês.',
  });

  expect(textsOf(renderer)).toEqual(['Nenhum lançamento pessoal neste mês.']);
  expect(buttons(renderer)).toHaveLength(0);
});

test('shows a spinner under the rows while the next page loads', async () => {
  const { renderer } = await render({ isLoadingMore: true });

  const spinner = renderer.root.findByType(ActivityIndicator);
  expect(spinner.props.accessibilityLabel).toBe(TEXTS.loadingMore);
  expect(textsOf(renderer)).toContain('Orquiectomia – Mel');
});

test('a failed next page keeps the rows and offers a retry under them', async () => {
  const onRetryLoadMore = jest.fn();
  const { renderer, props } = await render({
    loadMoreFailed: true,
    onRetryLoadMore,
  });

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Orquiectomia – Mel',
      TEXTS.loadMoreFailure,
      'Tentar novamente',
    ]),
  );

  await act(async () => buttons(renderer)[0].props.onPress());

  expect(onRetryLoadMore).toHaveBeenCalledTimes(1);
  expect(props.onRetry).not.toHaveBeenCalled();
});

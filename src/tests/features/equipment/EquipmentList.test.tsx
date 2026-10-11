import ReactTestRenderer, { act } from 'react-test-renderer';

import type { Equipment } from 'features/equipment';
import { EquipmentList } from 'features/equipment/components/EquipmentList';

const EQUIPMENT: Equipment = {
  id: 'eq-1',
  supplierId: null,
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: 8500,
  salvageValue: 0,
  acquisitionDate: '2022-03-01T00:00:00.000Z',
  usefulLifeMonths: 120,
  notes: null,
  active: true,
  monthlyDepreciation: 70.83,
  currentValue: 4604.17,
  usefulLifeUsedPct: 46,
  endOfLife: false,
};

const ITEM = {
  equipment: EQUIPMENT,
  monthlyValue: 'R$ 70,83',
  monthlyUnitLabel: '/mês',
  sinceLabel: 'Desde Mar 2022 · Valor atual R$ 4.604',
  progressPercent: 46,
  progressLabel: '46% da vida útil utilizada',
};

const SUMMARY = {
  label: 'Depreciação total/mês',
  value: 'R$ 70,83',
  detail: '1 equipamento · R$ 850/ano',
};

const BASE = {
  items: [ITEM],
  summary: SUMMARY,
  isLoading: false,
  errorMessage: null,
  loadingLabel: 'Carregando equipamentos...',
  emptyMessage: 'Nenhum equipamento cadastrado.',
  retryLabel: 'Tentar novamente',
  addLabel: 'Adicionar equipamento',
  onRetry: () => {},
  onAddPress: () => {},
  onEquipmentPress: () => {},
};

async function renderList(
  props: Partial<React.ComponentProps<typeof EquipmentList>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<EquipmentList {...BASE} {...props} />);
  });
  return renderer!;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat();
}

function pressables(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      (node.props?.accessibilityRole === 'button' ||
        node.props?.role === 'button') &&
      typeof node.props?.onPress === 'function',
  );
}

function pressByLabel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const target = pressables(renderer).find(
    node =>
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props?.children === label,
      ).length > 0,
  );
  return target!.props.onPress();
}

test('lists the summary and one card per equipment, with the add button', async () => {
  const renderer = await renderList();

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      SUMMARY.label,
      SUMMARY.value,
      SUMMARY.detail,
      EQUIPMENT.name,
      ITEM.sinceLabel,
      BASE.addLabel,
    ]),
  );
});

test('shows only the loading line while the first load runs', async () => {
  const renderer = await renderList({
    items: [],
    summary: null,
    isLoading: true,
  });

  expect(texts(renderer)).toContain(BASE.loadingLabel);
  expect(texts(renderer)).not.toContain(BASE.emptyMessage);
  expect(texts(renderer)).toContain(BASE.addLabel);
});

test('keeps the list on screen while a refresh runs', async () => {
  const renderer = await renderList({ isLoading: true });

  expect(texts(renderer)).not.toContain(BASE.loadingLabel);
  expect(texts(renderer)).toContain(EQUIPMENT.name);
});

test('the error shows its message and retry calls onRetry', async () => {
  const onRetry = jest.fn();
  const renderer = await renderList({
    items: [],
    summary: null,
    errorMessage: 'Não foi possível carregar os equipamentos.',
    onRetry,
  });

  expect(texts(renderer)).toContain(
    'Não foi possível carregar os equipamentos.',
  );
  expect(texts(renderer)).not.toContain(BASE.emptyMessage);

  await act(async () => {
    pressByLabel(renderer, BASE.retryLabel);
  });
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('the empty state hides the summary and keeps the add button', async () => {
  const renderer = await renderList({ items: [], summary: SUMMARY });

  expect(texts(renderer)).toContain(BASE.emptyMessage);
  expect(texts(renderer)).not.toContain(SUMMARY.label);
  expect(texts(renderer)).toContain(BASE.addLabel);
});

test('the add button calls onAddPress', async () => {
  const onAddPress = jest.fn();
  const renderer = await renderList({ onAddPress });

  await act(async () => {
    pressByLabel(renderer, BASE.addLabel);
  });

  expect(onAddPress).toHaveBeenCalledTimes(1);
});

test('pressing a card calls onEquipmentPress with that equipment', async () => {
  const onEquipmentPress = jest.fn();
  const renderer = await renderList({ onEquipmentPress });

  await act(async () => {
    pressByLabel(renderer, EQUIPMENT.name);
  });

  expect(onEquipmentPress).toHaveBeenCalledWith(EQUIPMENT);
});

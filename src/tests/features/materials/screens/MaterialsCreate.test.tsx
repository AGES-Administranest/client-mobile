import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialsScreen } from 'features/materials';
import { createItemLot } from 'features/materials/services/itemLotService';
import {
  createItem,
  fetchItems,
} from 'features/materials/services/itemService';
import { I18nProvider } from 'shared/i18n';

jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));
jest.mock('features/materials/services/itemLotService', () => ({
  createItemLot: jest.fn(),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;
const createItemMock = createItem as jest.MockedFunction<typeof createItem>;
const createItemLotMock = createItemLot as jest.MockedFunction<
  typeof createItemLot
>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchItemsMock.mockResolvedValue([]);
  createItemMock.mockResolvedValue({ id: 'novo' } as never);
  createItemLotMock.mockResolvedValue({} as never);
});

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MaterialsScreen />
      </I18nProvider>,
    );
  });
  return renderer!;
}

function pressables(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node => typeof node.props.onPress === 'function',
  );
}

function pressWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return pressables(renderer)
    .filter(node =>
      JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      ).includes(label),
    )
    .pop();
}

// Cada TextInput aparece como dois nós na árvore (wrapper + host), então
// os pares são deduplicados para que o índice case com a ordem dos campos.
function inputs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => typeof node.props.onChangeText === 'function')
    .filter((_, index) => index % 2 === 0);
}

async function createWithCategory(categoryLabel: string) {
  const renderer = await renderScreen();

  // Abre o modal de cadastro
  await act(async () => {
    pressWithText(renderer, 'Adicionar material')!.props.onPress();
  });

  // Escolhe a categoria dentro do modal
  await act(async () => {
    pressWithText(renderer, categoryLabel)!.props.onPress();
  });

  // Digita o nome -> abre o dropdown com "+ Adicionar <categoria>"
  const nameInput = inputs(renderer)[0];
  await act(async () => {
    nameInput.props.onChangeText('Item de teste');
  });

  const addOption = pressWithText(renderer, `+ Adicionar`);
  expect(addOption).toBeDefined();
  await act(async () => {
    addOption!.props.onPress();
  });

  // Preenche custo / unidade / quantidade
  await act(async () => {
    inputs(renderer)[1].props.onChangeText('1250');
  });
  await act(async () => {
    pressWithText(renderer, 'Digite a unidade')!.props.onPress();
  });
  await act(async () => {
    pressWithText(renderer, 'ampola')!.props.onPress();
  });
  await act(async () => {
    inputs(renderer)[2].props.onChangeText('5');
  });

  // Confirma
  await act(async () => {
    pressWithText(renderer, 'Confirmar')!.props.onPress();
  });

  return renderer;
}

test.each([
  ['Medicamento', 'MEDICATION'],
  ['Anestésico', 'ANESTHETIC'],
  ['Descartável', 'DISPOSABLE'],
])('creating a %s sends category %s', async (label, expected) => {
  await createWithCategory(label);

  expect(createItemMock).toHaveBeenCalledWith(
    expect.objectContaining({ category: expected }),
  );
});

test('switching category after typing keeps what the user already filled', async () => {
  const renderer = await renderScreen();

  await act(async () => {
    pressWithText(renderer, 'Adicionar material')!.props.onPress();
  });

  // Ordem natural: digita o nome primeiro...
  await act(async () => {
    inputs(renderer)[0].props.onChangeText('Propofol');
  });
  await act(async () => {
    pressWithText(renderer, '+ Adicionar')!.props.onPress();
  });
  await act(async () => {
    inputs(renderer)[1].props.onChangeText('1250');
  });

  // ...e só então percebe que a categoria está errada
  await act(async () => {
    pressWithText(renderer, 'Anestésico')!.props.onPress();
  });

  const values = inputs(renderer).map(i => String(i.props.value ?? ''));
  expect(values[0]).toBe('Propofol');
});

test('typing a name searches the items already in stock', async () => {
  fetchItemsMock.mockResolvedValue([
    {
      id: 'a',
      supplierId: null,
      category: 'MEDICATION',
      unit: 'AMPOULE',
      name: 'Dipirona 500mg',
      defaultUnitCost: '12.5000',
      minimumStock: '10.000',
      currentQuantity: '25.000',
      active: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'b',
      supplierId: null,
      category: 'MEDICATION',
      unit: 'BOX',
      name: 'Dipirona 1g',
      defaultUnitCost: '19.9000',
      minimumStock: '4.000',
      currentQuantity: '3.000',
      active: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      deletedAt: null,
    },
  ] as never);

  const renderer = await renderScreen();

  await act(async () => {
    pressWithText(renderer, 'Adicionar material')!.props.onPress();
  });
  await act(async () => {
    inputs(renderer)[0].props.onChangeText('Dipi');
  });

  // Os nomes tambem aparecem nos cards atras do modal, entao o sinal de que a
  // busca achou algo e o "+ Adicionar" sumir: ele so aparece quando NENHUM
  // item casa com o que foi digitado.
  expect(pressWithText(renderer, '+ Adicionar')).toBeUndefined();

  // E a opcao do dropdown precisa ser selecionavel: clicar nela preenche o
  // custo do item escolhido.
  const option = pressables(renderer)
    .filter(node =>
      JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      ).includes('Dipirona 500mg'),
    )
    .pop()!;
  await act(async () => {
    option.props.onPress();
  });

  expect(inputs(renderer).map(i => String(i.props.value ?? ''))).toContain(
    '12.5',
  );
});

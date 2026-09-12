import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialsScreen } from 'features/materials';
import type { BackendItem } from 'features/materials';
import {
  deleteItem,
  fetchItems,
} from 'features/materials/services/itemService';
import { I18nProvider } from 'shared/i18n';

jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;
const deleteItemMock = deleteItem as jest.MockedFunction<typeof deleteItem>;

const ITEM: BackendItem = {
  id: 'item-1',
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
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchItemsMock.mockResolvedValue([ITEM]);
  deleteItemMock.mockResolvedValue({ id: ITEM.id, name: ITEM.name });
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

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .filter(node => {
      const rendered = JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      );
      return rendered.includes(label);
    })
    .pop();
}

test('deleting an item goes through the confirmation and reaches the service', async () => {
  const renderer = await renderScreen();

  // Abre o card -> modal de detalhes
  const card = pressableWithText(renderer, 'Dipirona 500mg')!;
  await act(async () => {
    card.props.onPress();
  });

  // "Excluir" do detalhe abre a confirmação, e ainda NÃO exclui
  const deleteButton = pressableWithText(renderer, 'Excluir')!;
  await act(async () => {
    deleteButton.props.onPress();
  });
  expect(deleteItemMock).not.toHaveBeenCalled();
  expect(texts(renderer)).toContain('Tem certeza que deseja excluir');

  // Confirmar exclui de verdade
  const confirm = pressableWithText(renderer, 'Excluir')!;
  await act(async () => {
    confirm.props.onPress();
  });

  expect(deleteItemMock).toHaveBeenCalledWith('item-1');
  expect(texts(renderer)).not.toContain('Dipirona 500mg');
});

test('a failing delete surfaces an error the user can see', async () => {
  deleteItemMock.mockRejectedValue(new Error('boom'));
  const renderer = await renderScreen();

  const card = pressableWithText(renderer, 'Dipirona 500mg')!;
  await act(async () => {
    card.props.onPress();
  });
  const deleteButton = pressableWithText(renderer, 'Excluir')!;
  await act(async () => {
    deleteButton.props.onPress();
  });
  const confirm = pressableWithText(renderer, 'Excluir')!;
  await act(async () => {
    confirm.props.onPress();
  });

  expect(texts(renderer)).toContain('Não foi possível excluir o item.');
});

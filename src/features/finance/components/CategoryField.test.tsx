import { AccessibilityInfo, TextInput } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import {
  CategoryField,
  type CategoryFieldTexts,
  type NewCategoryInput,
} from './CategoryField';

type CategoryFieldProps = React.ComponentProps<typeof CategoryField>;

const TEXTS: CategoryFieldTexts = {
  label: 'Categoria',
  placeholder: 'Digite o nome da categoria',
  loading: 'Carregando categorias…',
  retry: 'Tentar de novo',
  noResults: 'Nenhuma categoria encontrada.',
  created: 'Categoria criada.',
  add: 'Adicionar Categoria',
  newPlaceholder: 'Digite o nome da nova categoria',
  create: 'Criar categoria',
};

const OPTIONS = [
  { id: 'cat-supplies', label: 'Insumos' },
  { id: 'cat-travel', label: 'Deslocamento' },
];

const NEW_CATEGORY: NewCategoryInput = {
  name: 'Comida',
  error: null,
  failure: null,
  canCreate: true,
  isSaving: false,
};

let announce: jest.SpyInstance;

beforeEach(() => {
  announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
});

afterEach(() => {
  announce.mockRestore();
});

async function render(overrides: Partial<CategoryFieldProps> = {}) {
  const props: CategoryFieldProps = {
    texts: TEXTS,
    status: 'ready',
    loadFailure: null,
    text: '',
    options: OPTIONS,
    selectedId: null,
    offersNewCategory: true,
    hasNoMatch: false,
    wasJustCreated: false,
    newCategory: null,
    onChangeText: jest.fn(),
    onSelect: jest.fn(),
    onRetry: jest.fn(),
    onStartNewCategory: jest.fn(),
    onChangeNewName: jest.fn(),
    onCreate: jest.fn(),
    ...overrides,
  };
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<CategoryField {...props} />);
  });
  return { renderer: renderer!, props };
}

function inputs(renderer: Renderer) {
  return renderer.root.findAll(node => node.type === TextInput);
}

function combobox(renderer: Renderer) {
  return inputs(renderer)[0];
}

async function focus(renderer: Renderer) {
  await act(async () => {
    combobox(renderer).props.onFocus();
  });
}

function texts(renderer: Renderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

function button(renderer: Renderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label ||
        node
          .findAllByType('Text' as never)
          .some(text => text.props.children === label)),
  );
}

test('is a combobox with the Figma placeholder and the chosen category as its text', async () => {
  const { renderer } = await render({
    text: 'Deslocamento',
    selectedId: 'cat-travel',
  });

  expect(combobox(renderer).props.accessibilityRole).toBe('combobox');
  expect(combobox(renderer).props.accessibilityLabel).toBe('Categoria');
  expect(combobox(renderer).props.placeholder).toBe(
    'Digite o nome da categoria',
  );
  expect(combobox(renderer).props.value).toBe('Deslocamento');
});

test('focusing lists the categories with the add row last, and picking one hands back its id', async () => {
  const { renderer, props } = await render();
  await focus(renderer);

  expect(texts(renderer)).toEqual([
    'Categoria',
    'Insumos',
    'Deslocamento',
    'Adicionar Categoria',
  ]);

  await act(async () => button(renderer, 'Deslocamento').props.onPress());
  expect(props.onSelect).toHaveBeenCalledWith('cat-travel');
});

test('typing is handed to the screen, which does the filtering', async () => {
  const { renderer, props } = await render();

  await act(async () => combobox(renderer).props.onChangeText('Comi'));

  expect(props.onChangeText).toHaveBeenCalledWith('Comi');
});

test('with no match only the add row shows, and it starts a new category', async () => {
  const { renderer, props } = await render({
    text: 'Comida',
    options: [],
    hasNoMatch: true,
  });
  await focus(renderer);

  expect(texts(renderer)).toEqual(['Categoria', 'Adicionar Categoria']);
  await act(async () =>
    button(renderer, 'Adicionar Categoria').props.onPress(),
  );
  expect(props.onStartNewCategory).toHaveBeenCalledTimes(1);
});

test('without the add row an empty search says nothing was found', async () => {
  const { renderer } = await render({
    options: [],
    offersNewCategory: false,
  });
  await focus(renderer);

  expect(texts(renderer)).toContain('Nenhuma categoria encontrada.');
});

test('says the categories are loading, and offers no add row meanwhile', async () => {
  const { renderer } = await render({ status: 'loading', options: [] });
  await focus(renderer);

  expect(texts(renderer)).toContain('Carregando categorias…');
  expect(texts(renderer)).not.toContain('Adicionar Categoria');
});

test('a failed load says why and the brown link loads them again', async () => {
  const { renderer, props } = await render({
    status: 'failed',
    loadFailure: 'Sem conexão.',
    options: [],
  });

  expect(texts(renderer)).toContain('Sem conexão.');
  const link = button(renderer, 'Tentar de novo');
  const linkText = link.findByType('Text' as never);
  expect(linkText.props.className).toContain('text-label-quartenery');
  await act(async () => link.props.onPress());
  expect(props.onRetry).toHaveBeenCalledTimes(1);
});

test('the field error shows under the combobox and is read with it', async () => {
  const { renderer } = await render({ error: 'Selecione uma categoria.' });

  expect(texts(renderer)).toContain('Selecione uma categoria.');
  expect(combobox(renderer).props.accessibilityHint).toBe(
    'Selecione uma categoria.',
  );
});

describe('new category row', () => {
  test('is a second input with the Figma placeholder and a "+" that creates', async () => {
    const { renderer, props } = await render({ newCategory: NEW_CATEGORY });

    const newName = inputs(renderer)[1];
    expect(newName.props.placeholder).toBe('Digite o nome da nova categoria');
    expect(newName.props.value).toBe('Comida');
    expect(newName.props.autoFocus).toBe(true);

    await act(async () => newName.props.onChangeText('Comida caseira'));
    expect(props.onChangeNewName).toHaveBeenCalledWith('Comida caseira');

    await act(async () => button(renderer, 'Criar categoria').props.onPress());
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  test('the keyboard return key also creates', async () => {
    const { renderer, props } = await render({ newCategory: NEW_CATEGORY });

    await act(async () => inputs(renderer)[1].props.onSubmitEditing());

    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  test('cannot create while the name is not valid or while saving', async () => {
    const { renderer, props } = await render({
      newCategory: { ...NEW_CATEGORY, canCreate: false, isSaving: true },
    });

    const create = button(renderer, 'Criar categoria');
    expect(create.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
    await act(async () => inputs(renderer)[1].props.onSubmitEditing());
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  test.each([
    [{ error: 'Use até 40 caracteres.' }, 'Use até 40 caracteres.'],
    [
      { failure: 'Não foi possível criar a categoria. Tente de novo.' },
      'Não foi possível criar a categoria. Tente de novo.',
    ],
  ])(
    'shows the problem %p in red, read with the input',
    async (problem, message) => {
      const { renderer } = await render({
        newCategory: { ...NEW_CATEGORY, ...problem },
      });

      expect(texts(renderer)).toContain(message);
      expect(inputs(renderer)[1].props.accessibilityHint).toBe(message);
    },
  );
});

describe('screen reader announcements', () => {
  test('announces when nothing matches, once', async () => {
    const { renderer, props } = await render();
    expect(announce).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(
        <CategoryField {...props} options={[]} hasNoMatch text="Comi" />,
      );
    });
    await act(async () => {
      renderer.update(
        <CategoryField {...props} options={[]} hasNoMatch text="Comid" />,
      );
    });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Nenhuma categoria encontrada.');
  });

  test('announces a created category', async () => {
    await render({ wasJustCreated: true });

    expect(announce).toHaveBeenCalledWith('Categoria criada.');
  });
});

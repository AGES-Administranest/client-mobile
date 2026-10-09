import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  EntryFormFields,
  type CategoriesState,
  type EntryFormTexts,
} from './EntryFormFields';
import type { EntryDraft } from '../domain/entryForm';

const TEXTS: EntryFormTexts = {
  nature: { label: 'Tipo', income: 'Entrada', expense: 'Saída' },
  description: { label: 'Descrição', placeholder: 'Ex: Conta de luz' },
  amount: { label: 'Valor (R$)', placeholder: '0,00' },
  date: { label: 'Data', placeholder: 'dd/mm/aaaa' },
  category: {
    label: 'Categoria',
    loading: 'Carregando categorias…',
    retry: 'Tentar de novo',
    empty: 'Nenhuma categoria para esse tipo.',
  },
  scope: {
    label: 'Escopo',
    professional: 'Profissional',
    personal: 'Pessoal',
    hint: 'Sugerido pela categoria. Você pode alterar.',
  },
};

const DRAFT: EntryDraft = {
  nature: 'EXPENSE',
  description: '',
  amount: '',
  date: '09/10/2026',
  categoryId: 'cat-travel',
  scope: 'PROFESSIONAL',
};

const READY: CategoriesState = {
  status: 'ready',
  options: [
    { id: 'cat-supplies', label: 'Insumos' },
    { id: 'cat-travel', label: 'Deslocamento' },
  ],
};

async function render(
  overrides: Partial<React.ComponentProps<typeof EntryFormFields>> = {},
) {
  const props = {
    draft: DRAFT,
    fieldErrors: {},
    texts: TEXTS,
    categories: READY,
    onChangeNature: jest.fn(),
    onChangeField: jest.fn(),
    onSelectCategory: jest.fn(),
    onChangeScope: jest.fn(),
    onRetryCategories: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(<EntryFormFields {...props} />);
  });
  return { renderer: renderer!, props };
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

function pressable(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityRole === 'button' &&
      node.findAllByType('Text' as never).some(t => t.props.children === label),
  );
}

function input(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
}

test('shows every field of the Figma form, in order', async () => {
  const { renderer } = await render();

  expect(texts(renderer)).toEqual([
    'Tipo',
    'Entrada',
    'Saída',
    'Descrição',
    'Valor (R$)',
    'Data',
    'Categoria',
    'Insumos',
    'Deslocamento',
    'Escopo',
    'Profissional',
    'Pessoal',
    'Sugerido pela categoria. Você pode alterar.',
  ]);
  expect(input(renderer, 'Data').props.value).toBe('09/10/2026');
});

test('marks the chosen type, category and scope as selected', async () => {
  const { renderer } = await render();

  const selected = (label: string) =>
    pressable(renderer, label).props.accessibilityState.selected;
  expect(selected('Saída')).toBe(true);
  expect(selected('Entrada')).toBe(false);
  expect(selected('Deslocamento')).toBe(true);
  expect(selected('Insumos')).toBe(false);
  expect(selected('Profissional')).toBe(true);
  expect(selected('Pessoal')).toBe(false);
});

test('marks Pessoal when that is the scope', async () => {
  const { renderer } = await render({ draft: { ...DRAFT, scope: 'PERSONAL' } });

  const selected = (label: string) =>
    pressable(renderer, label).props.accessibilityState.selected;
  expect(selected('Pessoal')).toBe(true);
  expect(selected('Profissional')).toBe(false);
});

test('reports each choice and each typed value', async () => {
  const { renderer, props } = await render();

  await act(() => {
    pressable(renderer, 'Entrada').props.onPress();
    pressable(renderer, 'Insumos').props.onPress();
    pressable(renderer, 'Pessoal').props.onPress();
    input(renderer, 'Descrição').props.onChangeText('Combustível');
    input(renderer, 'Valor (R$)').props.onChangeText('18000');
    input(renderer, 'Data').props.onChangeText('08102026');
  });

  expect(props.onChangeNature).toHaveBeenCalledWith('INCOME');
  expect(props.onSelectCategory).toHaveBeenCalledWith('cat-supplies');
  expect(props.onChangeScope).toHaveBeenCalledWith('PERSONAL');
  expect(props.onChangeField).toHaveBeenCalledWith(
    'description',
    'Combustível',
  );
  expect(props.onChangeField).toHaveBeenCalledWith('amount', '18000');
  expect(props.onChangeField).toHaveBeenCalledWith('date', '08102026');
});

test('opens the number pad for the amount and the date', async () => {
  const { renderer } = await render();

  expect(input(renderer, 'Valor (R$)').props.keyboardType).toBe('number-pad');
  expect(input(renderer, 'Data').props.keyboardType).toBe('number-pad');
});

test('shows each field error right under its own field', async () => {
  const { renderer } = await render({
    fieldErrors: {
      description: 'Informe uma descrição.',
      amount: 'Informe o valor.',
      date: 'Data inválida.',
      categoryId: 'Selecione uma categoria.',
    },
  });

  expect(texts(renderer)).toEqual([
    'Tipo',
    'Entrada',
    'Saída',
    'Descrição',
    'Informe uma descrição.',
    'Valor (R$)',
    'Informe o valor.',
    'Data',
    'Data inválida.',
    'Categoria',
    'Insumos',
    'Deslocamento',
    'Selecione uma categoria.',
    'Escopo',
    'Profissional',
    'Pessoal',
    'Sugerido pela categoria. Você pode alterar.',
  ]);
});

test.each<[CategoriesState, string]>([
  [{ status: 'loading' }, 'Carregando categorias…'],
  [{ status: 'ready', options: [] }, 'Nenhuma categoria para esse tipo.'],
])('explains the category list state %p', async (categories, message) => {
  const { renderer } = await render({ categories });

  expect(texts(renderer)).toContain(message);
});

test('a failed category load says why and can be retried', async () => {
  const { renderer, props } = await render({
    categories: { status: 'failed', message: 'Sem conexão.' },
  });

  expect(texts(renderer)).toContain('Sem conexão.');
  await act(() => pressable(renderer, 'Tentar de novo').props.onPress());
  expect(props.onRetryCategories).toHaveBeenCalledTimes(1);
});

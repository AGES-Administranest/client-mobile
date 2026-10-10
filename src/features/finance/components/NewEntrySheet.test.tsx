import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { EntryFormTexts } from './EntryFormFields';
import { NewEntrySheet } from './NewEntrySheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const FIELD_TEXTS: EntryFormTexts = {
  nature: { label: 'Tipo', income: 'Entrada', expense: 'Saída' },
  description: { label: 'Descrição', placeholder: '' },
  amount: { label: 'Valor (R$)', placeholder: '' },
  date: { label: 'Data', placeholder: '' },
  category: { label: 'Categoria', loading: '', retry: '', empty: '' },
  scope: {
    label: 'Escopo',
    professional: 'Profissional',
    personal: 'Pessoal',
    hint: '',
  },
};

async function render(
  overrides: Partial<React.ComponentProps<typeof NewEntrySheet>> = {},
) {
  const props: React.ComponentProps<typeof NewEntrySheet> = {
    visible: true,
    texts: {
      title: 'Novo lançamento manual',
      close: 'Fechar',
      save: 'Salvar',
      saving: 'Salvando…',
      fields: FIELD_TEXTS,
    },
    draft: {
      nature: 'EXPENSE',
      description: '',
      amount: '',
      date: '09/10/2026',
      categoryId: null,
      scope: 'PROFESSIONAL',
    },
    fieldErrors: {},
    categories: { status: 'ready', options: [] },
    failureMessage: null,
    isSaving: false,
    canSubmit: true,
    onChangeNature: jest.fn(),
    onChangeField: jest.fn(),
    onSelectCategory: jest.fn(),
    onChangeScope: jest.fn(),
    onRetryCategories: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <NewEntrySheet {...props} />
      </SafeAreaProvider>,
    );
  });
  return { renderer: renderer!, props };
}

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

const saveButton = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findByProps({ testID: 'finance-new-entry-save' });

test('shows the title and saves when Salvar is pressed', async () => {
  const { renderer, props } = await render();

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining(['Novo lançamento manual', 'Salvar']),
  );
  await act(() => saveButton(renderer).props.onPress());
  expect(props.onSubmit).toHaveBeenCalledTimes(1);
});

test('blocks Salvar while the form has errors', async () => {
  const { renderer } = await render({ canSubmit: false });

  expect(saveButton(renderer).props.disabled).toBe(true);
});

test('says it is saving and blocks a second tap', async () => {
  const { renderer } = await render({ isSaving: true, canSubmit: false });

  expect(textsOf(renderer)).toContain('Salvando…');
  expect(saveButton(renderer).props.disabled).toBe(true);
});

test('shows why the last save failed', async () => {
  const { renderer } = await render({
    failureMessage: 'Sem conexão. Tente de novo quando a internet voltar.',
  });

  expect(textsOf(renderer)).toContain(
    'Sem conexão. Tente de novo quando a internet voltar.',
  );
});

test('closes from the dimmed backdrop', async () => {
  const { renderer, props } = await render();

  await act(() =>
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress(),
  );
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

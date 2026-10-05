import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  FixedCostFormSheet,
  type FixedCostFormTexts,
} from './FixedCostFormSheet';
import {
  EMPTY_FIXED_COST_DRAFT,
  type FixedCostDraft,
} from '../domain/validateFixedCostForm';

const TEXTS: FixedCostFormTexts = {
  title: 'Novo custo fixo',
  editTitle: 'Editar custo fixo',
  confirm: 'Salvar',
  saving: 'Salvando...',
  deactivate: 'Inativar',
  deactivating: 'Inativando...',
  deactivateConfirmTitle: 'Inativar custo fixo',
  deactivateConfirmMessage: 'O histórico continua guardado.',
  close: 'Fechar',
  cancel: 'Cancelar',
  labels: {
    description: 'Descrição',
    monthlyAmount: 'Valor mensal',
    category: 'Categoria',
  },
  placeholders: {
    description: 'Ex.: Aluguel do consultório',
    monthlyAmount: 'R$ 0,00',
  },
  errors: {},
  categoryOptions: [
    { value: 'RENT', label: 'Aluguel' },
    { value: 'WATER', label: 'Água' },
    { value: 'OTHER', label: 'Outros' },
  ],
};

type Overrides = {
  draft?: Partial<FixedCostDraft>;
  isEditing?: boolean;
  isSaving?: boolean;
  isDeactivating?: boolean;
  failureText?: string | null;
  texts?: Partial<FixedCostFormTexts>;
};

async function render({
  draft = {},
  isEditing = false,
  isSaving = false,
  isDeactivating = false,
  failureText = null,
  texts = {},
}: Overrides = {}) {
  const spies = {
    onChangeText: jest.fn(),
    onChangeCategory: jest.fn(),
    onSubmit: jest.fn(),
    onDeactivate: jest.fn(),
    onClose: jest.fn(),
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <FixedCostFormSheet
        visible
        isEditing={isEditing}
        draft={{ ...EMPTY_FIXED_COST_DRAFT, ...draft }}
        isSaving={isSaving}
        isDeactivating={isDeactivating}
        failureText={failureText}
        texts={{ ...TEXTS, ...texts }}
        {...spies}
      />,
    );
  });

  return { renderer: renderer!, spies };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function inputOf(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
}

function buttonWithLabel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
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
        .some(text => text.props.children === label),
    )!;
}

test('shows the create title without a deactivate action', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toContain('Novo custo fixo');
  expect(textsOf(renderer)).not.toContain('Inativar');
});

test('shows the edit title with a deactivate action', async () => {
  const { renderer } = await render({ isEditing: true });

  expect(textsOf(renderer)).toContain('Editar custo fixo');
  expect(textsOf(renderer)).toContain('Inativar');
});

test('shows what is in the draft', async () => {
  const { renderer } = await render({
    draft: { description: 'Aluguel do consultório', monthlyAmount: '1200' },
  });

  expect(inputOf(renderer, 'Descrição').props.value).toBe(
    'Aluguel do consultório',
  );
  expect(inputOf(renderer, 'Valor mensal').props.value).toBe('1200');
});

test('reports each keystroke together with the field it belongs to', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    inputOf(renderer, 'Descrição').props.onChangeText('Internet');
  });

  expect(spies.onChangeText).toHaveBeenCalledWith('description', 'Internet');
});

test('shows the error under the field that failed', async () => {
  const { renderer } = await render({
    texts: { errors: { description: 'Preencha este campo.' } },
  });

  expect(textsOf(renderer)).toContain('Preencha este campo.');
});

test('shows the failure the API answered with', async () => {
  const { renderer } = await render({
    failureText: 'Não foi possível salvar o custo fixo.',
  });

  expect(textsOf(renderer)).toContain('Não foi possível salvar o custo fixo.');
});

test('confirms through onSubmit', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    buttonWithLabel(renderer, 'Salvar').props.onPress();
  });

  expect(spies.onSubmit).toHaveBeenCalledTimes(1);
});

test('locks the confirm button while saving', async () => {
  const { renderer } = await render({ isSaving: true });

  expect(textsOf(renderer)).toContain('Salvando...');
  expect(buttonWithLabel(renderer, 'Salvando...').props.disabled).toBe(true);
});

test('asks to confirm before deactivating, then calls onDeactivate', async () => {
  const { renderer, spies } = await render({ isEditing: true });

  await act(() => {
    buttonWithLabel(renderer, 'Inativar').props.onPress();
  });

  expect(textsOf(renderer)).toContain('Inativar custo fixo');
  expect(spies.onDeactivate).not.toHaveBeenCalled();

  await act(() => {
    renderer.root
      .findAll(
        node =>
          node.props.role === 'button' &&
          typeof node.props.onPress === 'function',
      )
      .filter(node =>
        node
          .findAllByType('Text' as never)
          .some(text => text.props.children === 'Inativar'),
      )
      .pop()!
      .props.onPress();
  });

  expect(spies.onDeactivate).toHaveBeenCalledTimes(1);
});

test('closes when the backdrop is tapped', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === 'Fechar' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
  });

  expect(spies.onClose).toHaveBeenCalledTimes(1);
});

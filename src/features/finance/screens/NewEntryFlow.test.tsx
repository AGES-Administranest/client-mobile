import { AccessibilityInfo, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { RequestTimeoutError } from 'shared/services/apiClient';

import { NewEntryFlow } from './NewEntryFlow';
import type { FinancialCategory } from '../domain/financialEntry';
import {
  createFinancialCategory,
  createFinancialEntry,
  fetchFinancialCategories,
} from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  createFinancialCategory: jest.fn(),
  createFinancialEntry: jest.fn(),
  fetchFinancialCategories: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = createFinancialEntry as jest.MockedFunction<
  typeof createFinancialEntry
>;
const fetchCategoriesMock = fetchFinancialCategories as jest.MockedFunction<
  typeof fetchFinancialCategories
>;
const createCategoryMock = createFinancialCategory as jest.MockedFunction<
  typeof createFinancialCategory
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION: AuthSession = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const CATEGORIES: FinancialCategory[] = [
  {
    id: 'cat-travel',
    name: 'Travel',
    nature: 'EXPENSE',
    defaultScope: 'PROFESSIONAL',
    isDefault: true,
  },
  {
    id: 'cat-supplies',
    name: 'Supplies',
    nature: 'EXPENSE',
    defaultScope: 'PROFESSIONAL',
    isDefault: true,
  },
];

const OPTIONS_DESCRIPTION =
  'Envie a nota ou o pedido em PDF para lançar automaticamente, ou preencha à mão.';

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

function pressByText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  const button = renderer.root.find(
    node =>
      (node.props.role === 'button' ||
        node.props.accessibilityRole === 'button') &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType('Text' as never).some(t => t.props.children === text),
  );
  return act(() => {
    button.props.onPress();
  });
}

function typeInto(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  const field = renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
  return act(() => field.props.onChangeText(value));
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  mounted.splice(0).forEach(renderer => act(() => renderer.unmount()));
});

async function renderFlow() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <NewEntryFlow />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(renderer!);
  return renderer!;
}

async function openOptions(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(() => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-button' })
      .props.onPress();
  });
}

function categoryCombobox(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityRole === 'combobox' &&
      typeof node.props.onFocus === 'function',
  );
}

async function chooseCategory(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  await act(async () => categoryCombobox(renderer).props.onFocus());
  await pressByText(renderer, label);
}

async function openManualForm(renderer: ReactTestRenderer.ReactTestRenderer) {
  await openOptions(renderer);
  await act(async () => {
    await pressByText(renderer, 'Lançamento manual');
  });
}

beforeEach(() => {
  fetchCategoriesMock.mockReset().mockResolvedValue(CATEGORIES);
  createMock.mockReset().mockImplementation(async (_token, payload) => ({
    ...payload,
    category: { id: payload.categoryId, name: 'Travel', scope: 'PROFESSIONAL' },
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
  }));
});

test('shows only the new entry button until it is pressed', async () => {
  const renderer = await renderFlow();

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});

test('opens the options sheet with the PDF and the manual choices', async () => {
  const renderer = await renderFlow();

  await openOptions(renderer);

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      OPTIONS_DESCRIPTION,
      'Enviar documento (PDF)',
      'Lançamento manual',
    ]),
  );
});

test('answers the PDF choice with a notice only after the options sheet is gone', async () => {
  const renderer = await renderFlow();
  await openOptions(renderer);

  await pressByText(renderer, 'Enviar documento (PDF)');

  const texts = textsOf(renderer);
  expect(texts).not.toContain(OPTIONS_DESCRIPTION);
  expect(texts).toEqual(
    expect.arrayContaining([
      'Envio de PDF em breve',
      'Por enquanto, registre a entrada ou a saída pelo lançamento manual.',
    ]),
  );

  await pressByText(renderer, 'Entendi');

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});

test('the manual choice opens the form, and only then loads the categories', async () => {
  const renderer = await renderFlow();
  expect(fetchCategoriesMock).not.toHaveBeenCalled();

  await openManualForm(renderer);

  const texts = textsOf(renderer);
  expect(texts).not.toContain(OPTIONS_DESCRIPTION);
  expect(texts).toContain('Novo lançamento manual');
  expect(fetchCategoriesMock).toHaveBeenCalledTimes(1);

  await act(async () => categoryCombobox(renderer).props.onFocus());
  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining(['Deslocamento', 'Insumos', 'Adicionar Categoria']),
  );
});

test('saving a filled form closes it and confirms the entry was saved', async () => {
  const renderer = await renderFlow();
  await openManualForm(renderer);

  await typeInto(renderer, 'Descrição', 'Combustível');
  await typeInto(renderer, 'Valor (R$)', '18000');
  await chooseCategory(renderer, 'Deslocamento');
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  expect(createMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({
      nature: 'EXPENSE',
      description: 'Combustível',
      amount: 180,
      categoryId: 'cat-travel',
      scope: 'PROFESSIONAL',
    }),
  );
  const texts = textsOf(renderer);
  expect(texts).not.toContain('Novo lançamento manual');
  expect(texts).toContain('Lançamento salvo.');
});

test('a category typed, created on the spot and saved goes into the entry', async () => {
  createCategoryMock.mockImplementation(async (_token, payload) => ({
    id: payload.id,
    name: payload.name,
    nature: payload.nature,
    defaultScope: payload.defaultScope,
    isDefault: false,
  }));
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Almoço com cliente');
  await typeInto(renderer, 'Valor (R$)', '4500');

  await act(async () => categoryCombobox(renderer).props.onFocus());
  await act(async () => categoryCombobox(renderer).props.onChangeText('Comi'));
  expect(textsOf(renderer)).not.toContain('Deslocamento');
  await pressByText(renderer, 'Adicionar Categoria');
  await typeInto(renderer, 'Digite o nome da nova categoria', 'Comida');
  await act(async () => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === 'Criar categoria' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
  });

  expect(createCategoryMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({
      name: 'Comida',
      nature: 'EXPENSE',
      defaultScope: 'PROFESSIONAL',
    }),
  );
  const [, createdCategory] = createCategoryMock.mock.calls[0];
  expect(categoryCombobox(renderer).props.value).toBe('Comida');

  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  expect(createMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({
      description: 'Almoço com cliente',
      amount: 45,
      categoryId: createdCategory.id,
    }),
  );
  expect(textsOf(renderer)).toContain('Lançamento salvo.');
});

test('a screen reader hears that the entry was saved, since the notice goes away', async () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  try {
    const renderer = await renderFlow();
    await openManualForm(renderer);
    await typeInto(renderer, 'Descrição', 'Combustível');
    await typeInto(renderer, 'Valor (R$)', '18000');
    await chooseCategory(renderer, 'Deslocamento');
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'finance-new-entry-save' })
        .props.onPress();
    });

    expect(announce).toHaveBeenCalledWith('Lançamento salvo.');
    const notice = renderer.root.find(
      node => typeof node.type === 'string' && node.props.role === 'status',
    );
    expect(notice.props.accessibilityLiveRegion).toBe('polite');
  } finally {
    announce.mockRestore();
  }
});

test('saving the empty form says what each field is missing, and a screen reader hears the first one', async () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  const renderer = await renderFlow();
  await openManualForm(renderer);

  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  expect(announce).toHaveBeenCalledWith('Informe uma descrição.');
  announce.mockRestore();
  expect(createMock).not.toHaveBeenCalled();
  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Informe uma descrição.',
      'Informe o valor.',
      'Selecione uma categoria.',
    ]),
  );
});

test('a failed save keeps the form open and says why', async () => {
  createMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  const renderer = await renderFlow();
  await openManualForm(renderer);

  await typeInto(renderer, 'Descrição', 'Combustível');
  await typeInto(renderer, 'Valor (R$)', '18000');
  await chooseCategory(renderer, 'Deslocamento');
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  const texts = textsOf(renderer);
  expect(texts).toContain('Novo lançamento manual');
  expect(texts).toContain(
    'Sem conexão. Tente de novo quando a internet voltar.',
  );
  expect(texts).not.toContain('Lançamento salvo.');
});

test('a save that gets no answer in time says so, and the form can be closed', async () => {
  createMock.mockRejectedValueOnce(
    new RequestTimeoutError('POST', '/financial-entries', 20000),
  );
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Combustível');
  await typeInto(renderer, 'Valor (R$)', '18000');
  await chooseCategory(renderer, 'Deslocamento');
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  expect(textsOf(renderer)).toContain(
    'Sem conexão. Tente de novo quando a internet voltar.',
  );
  expect(textsOf(renderer)).toContain('Salvar');

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress();
  });

  expect(textsOf(renderer)).not.toContain('Novo lançamento manual');
});

test('reopening the form starts a new, empty entry', async () => {
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Rascunho que não foi salvo');

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress();
  });
  await openManualForm(renderer);

  const description = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Descrição' &&
      typeof node.props.onChangeText === 'function',
  );
  expect(description.props.value).toBe('');
});

test('the form opens only after the options sheet has finished leaving', async () => {
  // Segura as animações de saída, como num aparelho de verdade: no iOS um
  // Modal não aparece enquanto outro ainda está fechando.
  const leaving: (() => void)[] = [];
  const timing = jest
    .spyOn(Animated, 'timing')
    .mockImplementation((value, config) => ({
      start: callback => {
        const finish = () => {
          (value as Animated.Value).setValue(config.toValue as number);
          callback?.({ finished: true });
        };
        if (config.toValue === 0) leaving.push(finish);
        else finish();
      },
      stop: () => {},
      reset: () => {},
    }));
  try {
    const renderer = await renderFlow();
    await openOptions(renderer);

    await pressByText(renderer, 'Lançamento manual');
    expect(textsOf(renderer)).not.toContain('Novo lançamento manual');
    expect(fetchCategoriesMock).not.toHaveBeenCalled();

    await act(async () => leaving.splice(0).forEach(finish => finish()));
    expect(textsOf(renderer)).toContain('Novo lançamento manual');
  } finally {
    timing.mockRestore();
  }
});

test('the form cannot be closed while it is saving', async () => {
  let finishSaving: (
    value: Awaited<ReturnType<typeof createFinancialEntry>>,
  ) => void = () => {};
  createMock.mockImplementationOnce(
    () => new Promise(resolve => (finishSaving = resolve)),
  );
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Combustível');
  await typeInto(renderer, 'Valor (R$)', '18000');
  await chooseCategory(renderer, 'Deslocamento');
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress();
  });
  expect(textsOf(renderer)).toContain('Salvando…');

  await act(async () =>
    finishSaving({
      id: 'entry-1',
      nature: 'EXPENSE',
      description: 'Combustível',
      category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
      scope: 'PROFESSIONAL',
      amount: 180,
      accrualDate: '2026-10-09T12:00:00.000Z',
      source: 'MANUAL',
      origin: { type: 'MANUAL', id: null },
    }),
  );
  expect(textsOf(renderer)).toContain('Lançamento salvo.');
  expect(textsOf(renderer)).not.toContain('Novo lançamento manual');
});

test('the saved notice goes away when the next entry starts', async () => {
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Combustível');
  await typeInto(renderer, 'Valor (R$)', '18000');
  await chooseCategory(renderer, 'Deslocamento');
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'finance-new-entry-save' })
      .props.onPress();
  });
  expect(textsOf(renderer)).toContain('Lançamento salvo.');

  await openOptions(renderer);

  expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
});

test('the saved notice goes away by itself after 3 seconds', async () => {
  jest.useFakeTimers();
  const elapse = (ms: number) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
    });
  const renderer = await renderFlow();
  try {
    await openOptions(renderer);
    await pressByText(renderer, 'Lançamento manual');
    await elapse(1000);
    await typeInto(renderer, 'Descrição', 'Combustível');
    await typeInto(renderer, 'Valor (R$)', '18000');
    await chooseCategory(renderer, 'Deslocamento');
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'finance-new-entry-save' })
        .props.onPress();
    });

    await elapse(2999);
    expect(textsOf(renderer)).toContain('Lançamento salvo.');

    await elapse(1);
    expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
  } finally {
    jest.useRealTimers();
  }
});

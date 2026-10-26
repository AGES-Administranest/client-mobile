import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { StockSyncProvider } from 'features/stock';
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

jest.mock('features/stock/services/stockSyncService', () => ({
  ...jest.requireActual('features/stock/services/stockSyncService'),
  pushPendingMovements: jest.fn(async () => ({
    applied: [],
    duplicated: [],
    balances: [],
    needsAdjustment: [],
  })),
  pullStockMovements: jest.fn(async () => ({
    movements: [],
    balances: [],
    cursor: 'cursor-1',
    hasMore: false,
    afterId: null,
  })),
}));

const mockFetchAdjustableItems = jest.fn();

jest.mock('features/stock/services/stockAdjustmentService', () => ({
  ...jest.requireActual('features/stock/services/stockAdjustmentService'),
  fetchAdjustableItems: (...args: unknown[]) =>
    mockFetchAdjustableItems(...args),
}));

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
  'Envie a nota ou o pedido em PDF, preencha à mão ou dê baixa em um item do estoque';

const STOCK_WRITE_OFF_TITLE = 'Registro de ajuste de saída';

const ADJUSTABLE_ITEMS = [
  {
    id: 'item-1',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    availableQuantity: 8,
    unitCost: 10,
  },
];

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
            <StockSyncProvider>
              <NewEntryFlow />
            </StockSyncProvider>
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

async function fillStockWriteOff(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Item' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ testID: 'item-option-item-1' }).props.onPress();
  });
  await typeInto(renderer, 'Quantidade', '2');
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Perda' }).props.onPress();
  });
}

// Segura as animações de saída, como num aparelho de verdade: no iOS um
// Modal não aparece enquanto outro ainda está fechando.
function holdExitAnimations() {
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
  return {
    finishLeaving: () =>
      act(async () => leaving.splice(0).forEach(finish => finish())),
    restore: () => timing.mockRestore(),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetchAdjustableItems.mockReset().mockResolvedValue(ADJUSTABLE_ITEMS);
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

test('opens the options sheet with the PDF, the manual and the stock write-off choices', async () => {
  const renderer = await renderFlow();

  await openOptions(renderer);

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      OPTIONS_DESCRIPTION,
      'Enviar documento (PDF)',
      'Lançamento manual',
      'Baixa no estoque',
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

test('saving a filled form closes it without a success notice', async () => {
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
  expect(texts).not.toContain('Lançamento salvo.');
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
  expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
});

test('saving an entry does not announce or show a success notice', async () => {
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

    expect(announce).not.toHaveBeenCalledWith('Lançamento salvo.');
    expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
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

test('reopening the form starts a new, empty entry, category field included', async () => {
  const renderer = await renderFlow();
  await openManualForm(renderer);
  await typeInto(renderer, 'Descrição', 'Rascunho que não foi salvo');
  await act(async () => categoryCombobox(renderer).props.onFocus());
  await act(async () => categoryCombobox(renderer).props.onChangeText('Comi'));
  await pressByText(renderer, 'Adicionar Categoria');

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
  expect(categoryCombobox(renderer).props.value).toBe('');
  expect(
    renderer.root.findAll(
      node =>
        node.props.accessibilityLabel === 'Digite o nome da nova categoria',
    ),
  ).toHaveLength(0);
});

test('reopening the form after the categories failed to load does not announce that failure again', async () => {
  fetchCategoriesMock.mockRejectedValueOnce(
    new TypeError('Network request failed'),
  );
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  try {
    const renderer = await renderFlow();
    await openManualForm(renderer);
    expect(announce).toHaveBeenCalledWith(
      'Sem conexão. Tente de novo quando a internet voltar.',
    );

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Fechar' })
        .props.onPress();
    });
    announce.mockClear();
    await openManualForm(renderer);

    expect(fetchCategoriesMock).toHaveBeenCalledTimes(2);
    expect(announce).not.toHaveBeenCalledWith(
      'Sem conexão. Tente de novo quando a internet voltar.',
    );
  } finally {
    announce.mockRestore();
  }
});

test('the form opens only after the options sheet has finished leaving', async () => {
  const animations = holdExitAnimations();
  try {
    const renderer = await renderFlow();
    await openOptions(renderer);

    await pressByText(renderer, 'Lançamento manual');
    expect(textsOf(renderer)).not.toContain('Novo lançamento manual');
    expect(fetchCategoriesMock).not.toHaveBeenCalled();

    await animations.finishLeaving();
    expect(textsOf(renderer)).toContain('Novo lançamento manual');
  } finally {
    animations.restore();
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
  expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
  expect(textsOf(renderer)).not.toContain('Novo lançamento manual');
});

test('saving an entry leaves no success notice when another entry starts', async () => {
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
  expect(textsOf(renderer)).not.toContain('Lançamento salvo.');

  await openOptions(renderer);

  expect(textsOf(renderer)).not.toContain('Lançamento salvo.');
});

test('the stock write-off opens only after the options sheet has finished leaving, and only then loads the items', async () => {
  const animations = holdExitAnimations();
  try {
    const renderer = await renderFlow();
    await openOptions(renderer);
    expect(mockFetchAdjustableItems).not.toHaveBeenCalled();

    await pressByText(renderer, 'Baixa no estoque');
    expect(textsOf(renderer)).not.toContain(STOCK_WRITE_OFF_TITLE);

    await animations.finishLeaving();
    expect(textsOf(renderer)).toContain(STOCK_WRITE_OFF_TITLE);
    expect(mockFetchAdjustableItems).toHaveBeenCalledTimes(1);
  } finally {
    animations.restore();
  }
});

test('saving a stock write-off closes the sheet without showing a success notice', async () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  const renderer = await renderFlow();
  await openOptions(renderer);
  await act(async () => {
    await pressByText(renderer, 'Baixa no estoque');
  });

  await fillStockWriteOff(renderer);
  await act(async () => {
    await pressByText(renderer, 'Salvar');
  });

  const texts = textsOf(renderer);
  expect(texts).not.toContain(STOCK_WRITE_OFF_TITLE);
  expect(texts).not.toContain('Baixa registrada.');
  expect(texts).not.toContain('Lançamento salvo.');
  expect(createMock).not.toHaveBeenCalled();
  expect(announce).not.toHaveBeenCalledWith('Baixa registrada.');
  announce.mockRestore();
});

test('closing the stock write-off without saving confirms nothing', async () => {
  const renderer = await renderFlow();
  await openOptions(renderer);
  await act(async () => {
    await pressByText(renderer, 'Baixa no estoque');
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress();
  });

  expect(textsOf(renderer)).toEqual(['Novo lançamento']);
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { ApiError, RequestTimeoutError } from 'shared/services/apiClient';

import { useNewEntryForm } from './useNewEntryForm';
import type {
  FinancialCategory,
  FinancialEntry,
} from '../domain/financialEntry';
import {
  createFinancialEntry,
  fetchFinancialCategories,
  updateFinancialEntry,
} from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  createFinancialEntry: jest.fn(),
  fetchFinancialCategories: jest.fn(),
  updateFinancialEntry: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = createFinancialEntry as jest.MockedFunction<
  typeof createFinancialEntry
>;
const updateMock = updateFinancialEntry as jest.MockedFunction<
  typeof updateFinancialEntry
>;
const fetchCategoriesMock = fetchFinancialCategories as jest.MockedFunction<
  typeof fetchFinancialCategories
>;

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

const category = (
  id: string,
  name: string,
  nature: FinancialCategory['nature'],
  defaultScope: FinancialCategory['defaultScope'] = 'PROFESSIONAL',
): FinancialCategory => ({ id, name, nature, defaultScope });

const CATEGORIES: FinancialCategory[] = [
  category('cat-other-out', 'Other', 'EXPENSE'),
  category('cat-travel', 'Travel', 'EXPENSE'),
  category('cat-fees', 'Professional fees', 'INCOME'),
  category('cat-other-in', 'Other', 'INCOME', 'PERSONAL'),
  category('cat-supplies', 'Supplies', 'EXPENSE'),
];

const CREATED: FinancialEntry = {
  id: 'entry-1',
  nature: 'EXPENSE',
  description: 'Combustível',
  category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
  scope: 'PROFESSIONAL',
  amount: 180,
  accrualDate: '2026-08-09T12:00:00.000Z',
  source: 'MANUAL',
  origin: { type: 'MANUAL', id: null },
};

let current: ReturnType<typeof useNewEntryForm>;

function Probe() {
  current = useNewEntryForm();
  return null;
}

async function mount(session: AuthSession | null = SESSION) {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Probe />
      </AuthProvider>,
    );
  });
}

async function fillValidExpense() {
  await act(async () => {
    current.setField('description', 'Combustível');
    current.setField('amount', '18000');
    current.setField('date', '09082026');
    current.chooseCategory(CATEGORIES[1]);
  });
}

async function submit() {
  let result: FinancialEntry | null = null;
  await act(async () => {
    result = await current.submit();
  });
  return result;
}

beforeEach(() => {
  createMock.mockReset().mockResolvedValue(CREATED);
  updateMock.mockReset();
  fetchCategoriesMock.mockReset().mockResolvedValue(CATEGORIES);
});

describe('with the clock on 08/10/2026', () => {
  // Só Date é falso; os timers reais continuam, porque o hook espera promessas.
  beforeAll(() => {
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
      ],
    });
    jest.setSystemTime(new Date(2026, 9, 8, 15, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('the form opens dated today', async () => {
    await mount();

    expect(current.draft.date).toBe('08/10/2026');
  });

  test('starting a new entry brings the whole form back to its start, failure included', async () => {
    await mount();
    await fillValidExpense();
    await act(async () => current.setNature('INCOME'));
    createMock.mockRejectedValueOnce(new ApiError('Boom', 'INTERNAL', 500));
    await act(async () => current.chooseCategory(CATEGORIES[3]));
    await act(async () => {
      current.setField('date', '01012026');
    });
    await submit();
    expect(current.failure).not.toBeNull();

    await act(async () => current.startNewEntry());

    expect(current.draft).toEqual({
      nature: 'EXPENSE',
      description: '',
      amount: '',
      date: '08/10/2026',
      categoryId: null,
      scope: 'PROFESSIONAL',
    });
    expect(current.failure).toBeNull();
    expect(current.errors).toEqual({});
  });
});

test('starts as an expense and lists only the expense categories', async () => {
  await mount();

  expect(current.draft.nature).toBe('EXPENSE');
  expect(current.categoriesStatus).toBe('ready');
  expect(current.categories.map(c => c.id)).toEqual([
    'cat-supplies',
    'cat-travel',
    'cat-other-out',
  ]);
  expect(fetchCategoriesMock).toHaveBeenCalledWith('id-token');
});

test('switching to income shows the income categories and drops the chosen one', async () => {
  await mount();
  await act(async () => current.chooseCategory(CATEGORIES[1]));

  await act(async () => current.setNature('INCOME'));

  expect(current.draft.categoryId).toBeNull();
  expect(current.categories.map(c => c.id)).toEqual([
    'cat-fees',
    'cat-other-in',
  ]);
});

test('choosing a category suggests its scope, and the scope can still change', async () => {
  await mount();
  await act(async () => current.setNature('INCOME'));

  await act(async () => current.chooseCategory(CATEGORIES[3]));
  expect(current.draft.scope).toBe('PERSONAL');

  await act(async () => current.setScope('PROFESSIONAL'));
  expect(current.draft.scope).toBe('PROFESSIONAL');
});

test('shows no errors until the first save, then blocks saving until they are fixed', async () => {
  await mount();
  expect(current.errors).toEqual({});
  expect(current.canSubmit).toBe(true);

  await expect(submit()).resolves.toBeNull();

  expect(createMock).not.toHaveBeenCalled();
  expect(current.errors).toEqual({
    description: 'required',
    amount: 'required',
    categoryId: 'required',
  });
  expect(current.canSubmit).toBe(false);

  await act(async () => current.setField('amount', '0'));
  expect(current.errors.amount).toBe('required');

  await fillValidExpense();
  expect(current.errors).toEqual({});
  expect(current.canSubmit).toBe(true);
});

test('saves the entry with the id created when the form opened', async () => {
  await mount();
  await fillValidExpense();

  await expect(submit()).resolves.toEqual(CREATED);

  expect(createMock).toHaveBeenCalledTimes(1);
  const [token, payload] = createMock.mock.calls[0];
  expect(token).toBe('id-token');
  expect(payload).toEqual({
    id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    nature: 'EXPENSE',
    description: 'Combustível',
    amount: 180,
    accrualDate: '2026-08-09T12:00:00.000Z',
    categoryId: 'cat-travel',
    scope: 'PROFESSIONAL',
  });
});

test('a retry after a lost connection sends the same id, so nothing is duplicated', async () => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(new TypeError('Network request failed'));

  await submit();
  expect(current.failure).toBe('financialEntries.form.failures.network');

  await submit();
  const [first, second] = createMock.mock.calls.map(
    ([, payload]) => payload.id,
  );
  expect(second).toBe(first);
  expect(current.failure).toBeNull();
});

test('a save that gets no answer in time can be retried with the same id', async () => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(
    new RequestTimeoutError('POST', '/financial-entries', 20000),
  );

  await submit();
  expect(current.failure).toBe('financialEntries.form.failures.network');
  expect(current.isSaving).toBe(false);
  expect(current.canSubmit).toBe(true);

  await expect(submit()).resolves.toEqual(CREATED);
  const [first, second] = createMock.mock.calls.map(
    ([, payload]) => payload.id,
  );
  expect(second).toBe(first);
});

test('a category the API refuses is cleared and the list is fetched again', async () => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(
    new ApiError('Invalid category', 'FINANCIAL_CATEGORY_INVALID', 400),
  );

  await submit();

  expect(current.failure).toBe(
    'financialEntries.form.failures.categoryInvalid',
  );
  expect(current.draft.categoryId).toBeNull();
  expect(fetchCategoriesMock).toHaveBeenCalledTimes(2);
});

test.each([
  [
    new ApiError('Not found', 'FINANCIAL_ENTRY_NOT_FOUND', 404),
    'financialEntries.form.failures.unknown',
  ],
  [
    new ApiError('Expired', 'TOKEN_EXPIRED', 401),
    'financialEntries.form.failures.session',
  ],
  [
    new ApiError('Boom', 'INTERNAL_ERROR', 500),
    'financialEntries.form.failures.unknown',
  ],
])('explains %p as %p', async (error, key) => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(error);

  await submit();

  expect(current.failure).toBe(key);
  expect(current.isSaving).toBe(false);
});

test('a retry after an edit keeps the id, so the earlier attempt is updated instead of duplicated', async () => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await submit();

  await act(async () => current.setField('amount', '25000'));
  await expect(submit()).resolves.toEqual(CREATED);

  const [first, second] = createMock.mock.calls.map(([, payload]) => payload);
  expect(second.id).toBe(first.id);
  expect(second.amount).toBe(250);
});

test('an id the API no longer knows is replaced, so the next try can save', async () => {
  await mount();
  await fillValidExpense();
  createMock.mockRejectedValueOnce(
    new ApiError('Not found', 'FINANCIAL_ENTRY_NOT_FOUND', 404),
  );
  await submit();

  expect(current.failure).toBe('financialEntries.form.failures.unknown');
  await expect(submit()).resolves.toEqual(CREATED);
  const [first, second] = createMock.mock.calls.map(
    ([, payload]) => payload.id,
  );
  expect(second).not.toBe(first);
});

test('the next entry gets a new id', async () => {
  await mount();
  await fillValidExpense();
  await submit();

  await act(async () => current.startNewEntry());
  await fillValidExpense();
  await submit();

  const [first, second] = createMock.mock.calls.map(
    ([, payload]) => payload.id,
  );
  expect(second).not.toBe(first);
});

test('two taps on save before the answer send a single request', async () => {
  await mount();
  await fillValidExpense();
  let finish: (entry: FinancialEntry) => void = () => {};
  createMock.mockImplementationOnce(
    () => new Promise(resolve => (finish = resolve)),
  );

  await act(async () => {
    current.submit();
    current.submit();
  });
  expect(createMock).toHaveBeenCalledTimes(1);
  expect(current.canSubmit).toBe(false);

  await act(async () => finish(CREATED));
  expect(current.isSaving).toBe(false);
});

test('the answer of a save started before a new entry does not touch it', async () => {
  await mount();
  await fillValidExpense();
  let fail: (error: unknown) => void = () => {};
  createMock.mockImplementationOnce(
    () => new Promise((_, reject) => (fail = reject)),
  );
  await act(async () => {
    current.submit();
  });

  await act(async () => current.startNewEntry());
  await act(async () => current.chooseCategory(CATEGORIES[1]));
  await act(async () =>
    fail(new ApiError('Invalid category', 'FINANCIAL_CATEGORY_INVALID', 400)),
  );

  expect(current.failure).toBeNull();
  expect(current.isSaving).toBe(false);
  expect(current.draft.categoryId).toBe('cat-travel');
  expect(fetchCategoriesMock).toHaveBeenCalledTimes(1);
});

test.each([
  [new TypeError('Network request failed'), 'network'],
  [new ApiError('Boom', 'INTERNAL_ERROR', 500), 'categories'],
])(
  'a failed category load (%p) says why, and can be retried',
  async (error, reason) => {
    fetchCategoriesMock.mockRejectedValueOnce(error);
    await mount();
    expect(current.categoriesStatus).toBe('failed');
    expect(current.categoriesFailure).toBe(
      `financialEntries.form.failures.${reason}`,
    );

    await act(async () => current.reloadCategories());

    expect(current.categoriesStatus).toBe('ready');
    expect(current.categoriesFailure).toBeNull();
    expect(current.categories).toHaveLength(3);
  },
);

test('a new entry after a failed category load loads them again', async () => {
  fetchCategoriesMock.mockRejectedValueOnce(
    new TypeError('Network request failed'),
  );
  await mount();
  expect(current.categoriesStatus).toBe('failed');

  await act(async () => current.startNewEntry());

  expect(fetchCategoriesMock).toHaveBeenCalledTimes(2);
  expect(current.categoriesStatus).toBe('ready');
  expect(current.categories).toHaveLength(3);
});

test('a new entry keeps the categories that already loaded', async () => {
  await mount();

  await act(async () => current.startNewEntry());

  expect(fetchCategoriesMock).toHaveBeenCalledTimes(1);
  expect(current.categoriesStatus).toBe('ready');
});

test('without a session nothing reaches the API and both loading and saving ask to sign in again', async () => {
  await mount(null);

  expect(fetchCategoriesMock).not.toHaveBeenCalled();
  expect(current.categoriesStatus).toBe('failed');
  expect(current.categoriesFailure).toBe(
    'financialEntries.form.failures.session',
  );

  await fillValidExpense();
  await submit();

  expect(createMock).not.toHaveBeenCalled();
  expect(current.failure).toBe('financialEntries.form.failures.session');
});

describe('editing a saved entry', () => {
  const FROM_APPOINTMENT: FinancialEntry = {
    ...CREATED,
    id: 'entry-apt',
    nature: 'INCOME',
    description: 'Orquiectomia',
    category: {
      id: 'cat-fees',
      name: 'Professional fees',
      scope: 'PROFESSIONAL',
    },
    amount: 620,
    accrualDate: '2026-08-17T13:30:00.000Z',
    source: 'APPOINTMENT',
    origin: { type: 'APPOINTMENT', id: 'apt-1' },
  };

  test('fills the form with the entry, unchanged and with nothing locked', async () => {
    await mount();

    await act(async () => current.startEditing(CREATED));

    expect(current.editedEntry).toBe(CREATED);
    expect(current.draft).toEqual({
      nature: 'EXPENSE',
      description: 'Combustível',
      amount: '180,00',
      date: '09/08/2026',
      categoryId: 'cat-travel',
      scope: 'PROFESSIONAL',
    });
    expect(current.hasChanges).toBe(false);
    expect(current.lockedFields).toEqual([]);
  });

  test('saves only what changed, on the same entry', async () => {
    const updated = { ...CREATED, description: 'Gasolina' };
    updateMock.mockResolvedValue(updated);
    await mount();
    await act(async () => current.startEditing(CREATED));

    await act(async () => current.setField('description', 'Gasolina'));
    expect(current.hasChanges).toBe(true);

    await expect(submit()).resolves.toEqual(updated);
    expect(updateMock).toHaveBeenCalledWith('id-token', 'entry-1', {
      description: 'Gasolina',
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  test('saving without changes asks nothing of the API', async () => {
    await mount();
    await act(async () => current.startEditing(CREATED));

    await expect(submit()).resolves.toBe(CREATED);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test('validates an edit like a new entry', async () => {
    await mount();
    await act(async () => current.startEditing(CREATED));
    await act(async () => current.setField('amount', ''));

    await expect(submit()).resolves.toBeNull();
    expect(current.errors).toEqual({ amount: 'required' });
    expect(current.canSubmit).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test('keeps type, amount and date of an automatic entry as the origin set them', async () => {
    updateMock.mockResolvedValue(FROM_APPOINTMENT);
    await mount();
    await act(async () => current.startEditing(FROM_APPOINTMENT));
    expect(current.lockedFields).toEqual(['nature', 'amount', 'date']);

    await act(async () => {
      current.setNature('EXPENSE');
      current.setField('amount', '100');
      current.setField('date', '01012026');
      current.setField('description', 'Orquiectomia – Mel');
    });

    expect(current.draft).toMatchObject({
      nature: 'INCOME',
      amount: '620,00',
      description: 'Orquiectomia – Mel',
    });
    await submit();
    expect(updateMock).toHaveBeenCalledWith('id-token', 'entry-apt', {
      description: 'Orquiectomia – Mel',
    });
  });

  test.each([
    [
      new ApiError('Not found', 'FINANCIAL_ENTRY_NOT_FOUND', 404),
      'financialEntries.detail.failures.notFound',
      true,
    ],
    [
      new ApiError('Locked', 'FINANCIAL_ENTRY_CONTROLLED_BY_ORIGIN', 400),
      'financialEntries.detail.failures.controlledByOrigin',
      false,
    ],
    [
      new TypeError('Network request failed'),
      'financialEntries.form.failures.network',
      false,
    ],
  ])('explains %p as %p', async (error, key, gone) => {
    updateMock.mockRejectedValue(error);
    await mount();
    await act(async () => current.startEditing(CREATED));
    await act(async () => current.setScope('PERSONAL'));

    await expect(submit()).resolves.toBeNull();

    expect(current.failure).toBe(key);
    expect(current.entryIsGone).toBe(gone);
    expect(current.isSaving).toBe(false);
  });

  test('a new entry after editing starts empty and creates', async () => {
    await mount();
    await act(async () => current.startEditing(CREATED));

    await act(async () => current.startNewEntry());

    expect(current.editedEntry).toBeNull();
    expect(current.draft.description).toBe('');
    await fillValidExpense();
    await submit();
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

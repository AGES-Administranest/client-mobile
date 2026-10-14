import { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useCategoryPicker } from './useCategoryPicker';
import type { LabeledCategory } from '../domain/financialCategory';
import type {
  EntryNature,
  EntryScope,
  FinancialCategory,
} from '../domain/financialEntry';
import { createFinancialCategory } from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  createFinancialCategory: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = createFinancialCategory as jest.MockedFunction<
  typeof createFinancialCategory
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
  label: string,
  nature: EntryNature = 'EXPENSE',
  defaultScope: EntryScope = 'PROFESSIONAL',
): LabeledCategory => ({
  id,
  name: label,
  label,
  nature,
  defaultScope,
  isDefault: false,
});

const CATEGORIES: LabeledCategory[] = [
  category('cat-supplies', 'Insumos'),
  category('cat-travel', 'Deslocamento'),
  category('cat-coffee', 'Café', 'EXPENSE', 'PERSONAL'),
  category('cat-fees', 'Honorários', 'INCOME'),
];

const UUID = /^[0-9a-f-]{36}$/;

type Harness = {
  picker: ReturnType<typeof useCategoryPicker>;
  selected: FinancialCategory | null;
  setNature: (nature: EntryNature) => void;
  setScope: (scope: EntryScope) => void;
};

let current: Harness;

function Probe() {
  const [nature, setNature] = useState<EntryNature>('EXPENSE');
  const [scope, setScope] = useState<EntryScope>('PERSONAL');
  const [selected, setSelected] = useState<FinancialCategory | null>(null);
  const [list, setList] = useState(CATEGORIES);
  const picker = useCategoryPicker({
    categories: list.filter(c => c.nature === nature),
    nature,
    scope,
    selectedId: selected?.id ?? null,
    onChoose: setSelected,
    onUnchoose: () => setSelected(null),
    onCreate: created => {
      setList(listed => [...listed, { ...created, label: created.name }]);
      setSelected(created);
    },
  });
  current = { picker, selected, setNature, setScope };
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

const labels = () => current.picker.options.map(option => option.label);

async function type(text: string) {
  await act(async () => current.picker.changeText(text));
}

async function startNewCategory(name?: string) {
  await act(async () => current.picker.startNewCategory());
  if (name !== undefined) {
    await act(async () => current.picker.changeNewName(name));
  }
}

async function create() {
  await act(async () => {
    await current.picker.createNewCategory();
  });
}

function createdCategory(
  payload: Parameters<typeof createFinancialCategory>[1],
): FinancialCategory {
  return { ...payload, isDefault: false };
}

beforeEach(() => {
  createMock
    .mockReset()
    .mockImplementation(async (_token, payload) => createdCategory(payload));
});

test('opens with every category of the type and the add row last', async () => {
  await mount();

  expect(current.picker.text).toBe('');
  expect(labels()).toEqual(['Insumos', 'Deslocamento', 'Café']);
  expect(current.picker.offersNewCategory).toBe(true);
  expect(current.picker.hasNoMatch).toBe(false);
  expect(current.picker.newCategory).toBeNull();
});

test.each([
  ['insu', ['Insumos'], false],
  ['cafe', ['Café'], false],
  ['Comi', [], true],
])(
  'typing %p shows %p and offers a new category: %p',
  async (term, expected, offers) => {
    await mount();

    await type(term);

    expect(current.picker.text).toBe(term);
    expect(labels()).toEqual(expected);
    expect(current.picker.offersNewCategory).toBe(offers);
    expect(current.picker.hasNoMatch).toBe(expected.length === 0);
  },
);

test('choosing a row selects it and shows its name with the whole list behind it', async () => {
  await mount();
  await type('insu');

  await act(async () => current.picker.choose('cat-supplies'));

  expect(current.selected?.id).toBe('cat-supplies');
  expect(current.picker.text).toBe('Insumos');
  expect(labels()).toEqual(['Insumos', 'Deslocamento', 'Café']);
});

test('typing again undoes the choice, so the value never differs from what the field shows', async () => {
  await mount();
  await act(async () => current.picker.choose('cat-supplies'));

  await type('Insumo');

  expect(current.selected).toBeNull();
  expect(current.picker.text).toBe('Insumo');
});

test('starting a new category keeps the typed name and creates it with the scope chosen in the form', async () => {
  await mount();
  await type('Comi');
  await startNewCategory();

  expect(current.picker.text).toBe('');
  expect(current.picker.newCategory).toMatchObject({
    name: 'Comi',
    canCreate: true,
  });

  await act(async () => current.picker.changeNewName(' Comida  caseira '));
  await create();

  expect(createMock).toHaveBeenCalledWith('id-token', {
    id: expect.stringMatching(UUID),
    name: 'Comida caseira',
    nature: 'EXPENSE',
    defaultScope: 'PERSONAL',
  });
  expect(current.selected).toMatchObject({
    name: 'Comida caseira',
    defaultScope: 'PERSONAL',
  });
  expect(current.picker.text).toBe('Comida caseira');
  expect(current.picker.newCategory).toBeNull();
  expect(current.picker.wasJustCreated).toBe(true);
});

test('starting a new category over a chosen one clears the choice', async () => {
  await mount();
  await act(async () => current.picker.choose('cat-travel'));

  await startNewCategory();

  expect(current.selected).toBeNull();
  expect(current.picker.newCategory?.name).toBe('');
  expect(current.picker.newCategory?.canCreate).toBe(false);
});

test('a name already listed selects that category without asking the API', async () => {
  await mount();
  await startNewCategory(' INSUMOS ');

  await create();

  expect(createMock).not.toHaveBeenCalled();
  expect(current.selected?.id).toBe('cat-supplies');
  expect(current.picker.newCategory).toBeNull();
  expect(current.picker.wasJustCreated).toBe(false);
});

test('a name of the other type is not a duplicate', async () => {
  await mount();
  await startNewCategory('Honorários');

  await create();

  expect(createMock).toHaveBeenCalledTimes(1);
});

test('a name over 40 characters says so and cannot be sent', async () => {
  await mount();
  await startNewCategory('a'.repeat(41));

  expect(current.picker.newCategory).toMatchObject({
    error: 'tooLong',
    canCreate: false,
  });
  await create();
  expect(createMock).not.toHaveBeenCalled();
});

test('a 409 for a name taken on the server selects the category it points to', async () => {
  createMock.mockRejectedValueOnce(
    new ApiError('Taken', 'FINANCIAL_CATEGORY_DUPLICATED', 409, {
      id: 'cat-coffee',
    }),
  );
  await mount();
  await startNewCategory('Coffee');

  await create();

  expect(current.selected?.id).toBe('cat-coffee');
  expect(current.picker.newCategory).toBeNull();
  expect(current.picker.text).toBe('Café');
});

test('a 409 pointing to a category the list does not have yet adds it with the typed name', async () => {
  createMock.mockRejectedValueOnce(
    new ApiError('Taken', 'FINANCIAL_CATEGORY_DUPLICATED', 409, {
      id: 'cat-food',
    }),
  );
  await mount();
  await startNewCategory('Comida');

  await create();

  expect(current.selected).toEqual({
    id: 'cat-food',
    name: 'Comida',
    nature: 'EXPENSE',
    defaultScope: 'PERSONAL',
    isDefault: false,
  });
  expect(current.picker.text).toBe('Comida');
});

test('a lost connection keeps the name, and the retry sends the same id', async () => {
  createMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await mount();
  await startNewCategory('Comida');

  await create();

  expect(current.picker.newCategory).toMatchObject({
    name: 'Comida',
    failure: 'financialEntries.form.failures.network',
    isSaving: false,
  });
  expect(current.selected).toBeNull();

  await create();

  const [first, second] = createMock.mock.calls.map(([, payload]) => payload);
  expect(second.id).toBe(first.id);
  expect(current.selected?.name).toBe('Comida');
});

test('an id already taken by another category gets a new id for the next try', async () => {
  createMock.mockRejectedValueOnce(
    new ApiError('Taken', 'FINANCIAL_CATEGORY_ID_CONFLICT', 409),
  );
  await mount();
  await startNewCategory('Comida');

  await create();
  expect(current.picker.newCategory?.failure).toBe(
    'financialEntries.categoryField.createFailed',
  );

  await create();
  const [first, second] = createMock.mock.calls.map(([, payload]) => payload);
  expect(second.id).not.toBe(first.id);
});

test('the next new category gets a new id', async () => {
  await mount();
  await startNewCategory('Comida');
  await create();

  await startNewCategory('Limpeza');
  await create();

  const [first, second] = createMock.mock.calls.map(([, payload]) => payload);
  expect(second.id).not.toBe(first.id);
});

test('switching the type clears the term and leaves the new category', async () => {
  await mount();
  await type('Comi');
  await startNewCategory();

  await act(async () => current.setNature('INCOME'));

  expect(current.picker.text).toBe('');
  expect(current.picker.newCategory).toBeNull();
  expect(labels()).toEqual(['Honorários']);
});

test('an answer that arrives after switching the type is ignored', async () => {
  let finish: (category: FinancialCategory) => void = () => {};
  createMock.mockImplementationOnce(
    () => new Promise(resolve => (finish = resolve)),
  );
  await mount();
  await startNewCategory('Comida');
  await act(async () => {
    current.picker.createNewCategory();
  });
  expect(current.picker.newCategory?.isSaving).toBe(true);

  await act(async () => current.setNature('INCOME'));
  await act(async () =>
    finish({
      id: 'cat-food',
      name: 'Comida',
      nature: 'EXPENSE',
      defaultScope: 'PERSONAL',
      isDefault: false,
    }),
  );

  expect(current.selected).toBeNull();
  expect(current.picker.newCategory).toBeNull();
  expect(current.picker.wasJustCreated).toBe(false);
});

test('two taps on create before the answer send a single request', async () => {
  await mount();
  await startNewCategory('Comida');

  await act(async () => {
    current.picker.createNewCategory();
    current.picker.createNewCategory();
  });

  expect(createMock).toHaveBeenCalledTimes(1);
});

test('without a session nothing reaches the API and it asks to sign in again', async () => {
  await mount(null);
  await startNewCategory('Comida');

  await create();

  expect(createMock).not.toHaveBeenCalled();
  expect(current.picker.newCategory?.failure).toBe(
    'financialEntries.form.failures.session',
  );
});

test('reset brings the field back to its start', async () => {
  await mount();
  await type('Comi');
  await startNewCategory();

  await act(async () => current.picker.reset());

  expect(current.picker.text).toBe('');
  expect(current.picker.newCategory).toBeNull();
  expect(labels()).toHaveLength(3);
});

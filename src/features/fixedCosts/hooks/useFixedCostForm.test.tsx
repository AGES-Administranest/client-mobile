import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useFixedCostForm } from './useFixedCostForm';
import type { FixedCost } from '../domain/fixedCost';
import { EMPTY_FIXED_COST_DRAFT } from '../domain/validateFixedCostForm';
import { createFixedCost, updateFixedCost } from '../services/fixedCostService';

jest.mock('../services/fixedCostService', () => ({
  createFixedCost: jest.fn(),
  updateFixedCost: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createFixedCostMock = createFixedCost as jest.MockedFunction<
  typeof createFixedCost
>;
const updateFixedCostMock = updateFixedCost as jest.MockedFunction<
  typeof updateFixedCost
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

const EXISTING: FixedCost = {
  id: 'fixed-cost-1',
  description: 'Aluguel do consultório',
  monthlyAmount: 1200.5,
  category: 'RENT',
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

let current: ReturnType<typeof useFixedCostForm>;

function Probe({ editing }: { editing: FixedCost | null }) {
  current = useFixedCostForm(editing);
  return null;
}

async function mount(
  editing: FixedCost | null = null,
  session: AuthSession | null = SESSION,
) {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Probe editing={editing} />
      </AuthProvider>,
    );
  });
}

beforeEach(() => {
  createFixedCostMock.mockReset();
  updateFixedCostMock.mockReset();
});

test('starts with an empty draft in create mode', async () => {
  await mount();

  expect(current.draft).toEqual(EMPTY_FIXED_COST_DRAFT);
  expect(current.isEditing).toBe(false);
  expect(current.errors).toEqual({});
});

test('starts with the fixed cost loaded in edit mode', async () => {
  await mount(EXISTING);

  expect(current.isEditing).toBe(true);
  expect(current.draft).toEqual({
    description: 'Aluguel do consultório',
    monthlyAmount: '1200,5',
    category: 'RENT',
  });
});

test('refuses to save an empty draft and never calls the API', async () => {
  await mount();

  let created: FixedCost | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(created).toBeNull();
  expect(current.errors).toEqual({
    description: 'required',
    monthlyAmount: 'required',
    category: 'required',
  });
  expect(createFixedCostMock).not.toHaveBeenCalled();
});

test('clears a field error as soon as it is edited', async () => {
  await mount();
  await act(async () => {
    await current.submit();
  });
  expect(current.errors).toHaveProperty('description', 'required');

  await act(async () => current.setField('description', 'Internet'));

  expect(current.errors).not.toHaveProperty('description');
});

test('creates the fixed cost with the id token and the parsed payload', async () => {
  createFixedCostMock.mockResolvedValue({
    ...EXISTING,
    id: 'fixed-cost-2',
  });
  await mount();

  await act(async () => {
    current.setField('description', 'Internet');
    current.setField('monthlyAmount', '199,90');
    current.setCategory('INTERNET');
  });

  let created: FixedCost | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(createFixedCostMock).toHaveBeenCalledWith('id-token', {
    description: 'Internet',
    monthlyAmount: 199.9,
    category: 'INTERNET',
  });
  expect(created).toEqual({ ...EXISTING, id: 'fixed-cost-2' });
  expect(current.isSaving).toBe(false);
});

test('updates an existing fixed cost without losing its id', async () => {
  updateFixedCostMock.mockResolvedValue({
    id: EXISTING.id,
    updatedAt: '2026-09-10T00:00:00.000Z',
  });
  await mount(EXISTING);

  await act(async () => current.setField('monthlyAmount', '1300'));

  let updated: FixedCost | null | undefined;
  await act(async () => {
    updated = await current.submit();
  });

  expect(updateFixedCostMock).toHaveBeenCalledWith('id-token', EXISTING.id, {
    description: EXISTING.description,
    monthlyAmount: 1300,
    category: EXISTING.category,
  });
  expect(updated).toEqual({
    ...EXISTING,
    monthlyAmount: 1300,
    updatedAt: '2026-09-10T00:00:00.000Z',
  });
});

test('deactivates without touching the other fields', async () => {
  updateFixedCostMock.mockResolvedValue({
    id: EXISTING.id,
    updatedAt: '2026-09-11T00:00:00.000Z',
  });
  await mount(EXISTING);

  let result: FixedCost | null | undefined;
  await act(async () => {
    result = await current.deactivate();
  });

  expect(updateFixedCostMock).toHaveBeenCalledWith('id-token', EXISTING.id, {
    active: false,
  });
  expect(result).toEqual({
    ...EXISTING,
    active: false,
    updatedAt: '2026-09-11T00:00:00.000Z',
  });
});

test('does nothing when asked to deactivate in create mode', async () => {
  await mount();

  let result: FixedCost | null | undefined;
  await act(async () => {
    result = await current.deactivate();
  });

  expect(result).toBeNull();
  expect(updateFixedCostMock).not.toHaveBeenCalled();
});

test('reports a session failure without calling the API', async () => {
  await mount(null, null);
  await act(async () => {
    current.setField('description', 'Internet');
    current.setField('monthlyAmount', '100');
    current.setCategory('INTERNET');
  });

  await act(async () => {
    await current.submit();
  });

  expect(createFixedCostMock).not.toHaveBeenCalled();
  expect(current.failure).toBe('session');
});

test('reports an unknown failure from the API', async () => {
  createFixedCostMock.mockRejectedValue(
    new ApiError('Validation failed', 'VALIDATION_ERROR', 400),
  );
  await mount();
  await act(async () => {
    current.setField('description', 'Internet');
    current.setField('monthlyAmount', '100');
    current.setCategory('INTERNET');
  });

  let created: FixedCost | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(created).toBeNull();
  expect(current.failure).toBe('unknown');
  expect(current.isSaving).toBe(false);
});

test('reset restores the draft and clears errors and failure', async () => {
  createFixedCostMock.mockRejectedValue(new Error('boom'));
  await mount();
  await act(async () => {
    await current.submit();
  });
  expect(current.errors).not.toEqual({});

  await act(async () => current.reset());

  expect(current.draft).toEqual(EMPTY_FIXED_COST_DRAFT);
  expect(current.errors).toEqual({});
  expect(current.failure).toBeNull();
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useEquipmentList } from './useEquipmentList';
import type { Equipment, EquipmentSummary } from '../domain/equipment.types';
import { equipmentService } from '../services/equipmentService';

jest.mock('../services/equipmentService', () => ({
  equipmentService: { list: jest.fn(), summary: jest.fn() },
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const listMock = equipmentService.list as jest.MockedFunction<
  typeof equipmentService.list
>;
const summaryMock = equipmentService.summary as jest.MockedFunction<
  typeof equipmentService.summary
>;

const SESSION = {
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

const EQUIPMENT: Equipment = {
  id: 'eq-1',
  name: 'Vaporizador',
  supplierId: null,
  purchaseValue: 8500,
  salvageValue: 0,
  acquisitionDate: '2022-03-10T00:00:00.000Z',
  usefulLifeMonths: 120,
  notes: null,
  active: true,
  monthlyDepreciation: 70.83,
  currentValue: 4604.35,
  usefulLifeUsedPct: 46,
  endOfLife: false,
};

const SUMMARY: EquipmentSummary = {
  monthlyTotal: 70.83,
  count: 1,
  yearlyTotal: 849.96,
};

type HookState = ReturnType<typeof useEquipmentList>;

async function renderHook(session: typeof SESSION | null = SESSION) {
  const latest = { current: null as unknown as HookState };
  function Probe() {
    latest.current = useEquipmentList();
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session ?? undefined}
        initialAccount={ACCOUNT}
      >
        <Probe />
      </AuthProvider>,
    );
  });
  return latest;
}

beforeEach(() => {
  listMock.mockReset();
  summaryMock.mockReset();
});

test('loads the list and the summary with the session token', async () => {
  listMock.mockResolvedValue([EQUIPMENT]);
  summaryMock.mockResolvedValue(SUMMARY);

  const state = await renderHook();

  expect(listMock).toHaveBeenCalledWith('id-token');
  expect(summaryMock).toHaveBeenCalledWith('id-token');
  expect(state.current.equipments).toEqual([EQUIPMENT]);
  expect(state.current.summary).toEqual(SUMMARY);
  expect(state.current.isLoading).toBe(false);
  expect(state.current.error).toBeNull();
});

test('exposes a load error and recovers on refresh', async () => {
  listMock.mockRejectedValueOnce(new Error('boom'));
  summaryMock.mockResolvedValue(SUMMARY);

  const state = await renderHook();
  expect(state.current.error).toBe('equipment.errorLoad');

  listMock.mockResolvedValue([EQUIPMENT]);
  await act(async () => {
    await state.current.refresh();
  });

  expect(state.current.error).toBeNull();
  expect(state.current.equipments).toEqual([EQUIPMENT]);
});

test('reports the session error when there is no token', async () => {
  const state = await renderHook(null);

  expect(listMock).not.toHaveBeenCalled();
  expect(state.current.error).toBe('equipment.errorSession');
});

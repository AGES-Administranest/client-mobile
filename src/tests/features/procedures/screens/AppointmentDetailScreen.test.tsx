import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import {
  useAppointmentDetail,
  type AppointmentDetailState,
} from 'features/procedures/hooks/useAppointmentDetail';
import { AppointmentDetailScreen } from 'features/procedures/screens/AppointmentDetailScreen';
import type { AppointmentResult } from 'features/procedures/services/procedureService';
import { I18nProvider } from 'shared/i18n';

// A tela é testada pela exclusão: os dados vêm prontos, sem a API.
jest.mock('features/procedures/hooks/useAppointmentDetail', () => ({
  useAppointmentDetail: jest.fn(),
}));
jest.mock('features/stock', () => ({
  SupplySelectorSheet: () => null,
  useSupplySelector: () => ({ reset: jest.fn() }),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const detailMock = useAppointmentDetail as jest.MockedFunction<
  typeof useAppointmentDetail
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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

const APPOINTMENT: AppointmentResult = {
  id: 'apt-1',
  clientId: null,
  procedureName: 'Orquiectomia',
  startsAt: '2026-10-16T13:00:00.000Z',
  endsAt: '2026-10-16T14:00:00.000Z',
  location: null,
  amount: '500',
  patientName: 'Mel',
  ownerName: null,
  species: 'CANINE',
  patientAgeYears: 3,
  weightKg: '10',
  asa: 'I',
  notes: null,
  status: 'COMPLETED',
  createdAt: '2026-10-15T12:00:00.000Z',
  updatedAt: '2026-10-16T14:00:00.000Z',
  deletedAt: null,
} as AppointmentResult;

function detailState(
  overrides: Partial<AppointmentDetailState> = {},
): AppointmentDetailState {
  return {
    appointment: APPOINTMENT,
    supplies: [],
    status: 'ready',
    pendingSync: false,
    supplyFailed: false,
    savingSupply: false,
    refetch: jest.fn(),
    addSupply: jest.fn(),
    removeSupply: jest.fn(),
    saveAmount: jest.fn(),
    remove: jest.fn(async () => true),
    ...overrides,
  };
}

async function openDelete(state: AppointmentDetailState) {
  detailMock.mockReturnValue(state);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <AppointmentDetailScreen
              appointmentId="apt-1"
              onClose={jest.fn()}
              onChanged={jest.fn()}
            />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  const trash = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Excluir' &&
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string',
  );
  await act(async () => trash.props.onPress());
  return renderer;
}

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

test('deleting a completed appointment warns that its entry and supplies go along', async () => {
  const renderer = await openDelete(
    detailState({
      supplies: [{ id: 'mov-1', name: 'Dipirona', quantity: 2, unitCost: 5 }],
    }),
  );

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Excluir este atendimento?',
      'Ao excluir:',
      'O lançamento dele sai do extrato de Finanças.',
      'Os materiais usados voltam para o estoque.',
      'O atendimento sai da agenda e do histórico.',
    ]),
  );
});

test('a scheduled appointment without supplies only leaves the schedule', async () => {
  const renderer = await openDelete(
    detailState({ appointment: { ...APPOINTMENT, status: 'SCHEDULED' } }),
  );

  expect(textsOf(renderer)).toContain(
    'O atendimento sai da agenda e do histórico.',
  );
  expect(textsOf(renderer)).not.toContain(
    'O lançamento dele sai do extrato de Finanças.',
  );
  expect(textsOf(renderer)).not.toContain(
    'Os materiais usados voltam para o estoque.',
  );
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { ProcedureEstimateScreen } from './ProcedureEstimateScreen';
import type { ProcedureEstimateResponse } from '../domain/pricing.types';
import { pricingService } from '../services/pricingService';
import {
  resetLegacyCleanedForTesting,
  savedProcedureEstimateService,
} from '../services/savedProcedureEstimateService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn().mockResolvedValue([]),
}));
jest.mock('features/stock', () => ({
  formatSupplyPrice: (price: number) => `R$ ${price.toFixed(2)}`,
  SupplySelectorSheet: () => null,
  useSupplySelector: () => ({
    term: '',
    onTermChange: jest.fn(),
    options: [],
    isLoading: false,
    hasError: false,
    isTermTooShort: false,
    selected: null,
    onSelect: jest.fn(),
    quantity: '1',
    onQuantityChange: jest.fn(),
    isOverBalance: false,
    canSubmit: true,
    submit: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../services/pricingService', () => {
  const actual = jest.requireActual('../services/pricingService');
  return {
    ...actual,
    pricingService: {
      getHourlyRate: jest.fn(),
      estimateProcedure: jest.fn(),
      saveSettings: jest.fn(),
    },
  };
});

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

const mockEstimateResponse: ProcedureEstimateResponse = {
  minimumPrice: '131.47',
  breakEvenPrice: '126.28',
  hoursCost: '57.12',
  tripCost: '49.35',
  suppliesCost: '25.00',
  hourlyRateUsed: '38.08',
  minimumHourlyRateUsed: '34.62',
  tripEstimateAvailable: true,
  tripEstimateDays: 2,
  suppliesWithoutCost: [],
  durationMinutes: 90,
  month: 11,
  year: 2026,
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

describe('ProcedureEstimateScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    resetLegacyCleanedForTesting();
    jest.useFakeTimers();
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
      renderer = null;
    }
  });

  async function renderScreen(
    props: { visible?: boolean; onClose?: () => void } = {},
  ) {
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <I18nProvider initialLocale="pt-BR">
              <ProcedureEstimateScreen
                visible={props.visible ?? true}
                onClose={props.onClose ?? jest.fn()}
              />
            </I18nProvider>
          </AuthProvider>
        </SafeAreaProvider>,
      );
      await Promise.resolve();
    });
    return renderer!;
  }

  it('renders the screen with form inputs and title', async () => {
    const rendered = await renderScreen({ visible: true });

    expect(rendered.toJSON()).toBeDefined();
    const tree = JSON.stringify(rendered.toJSON());
    expect(tree).toContain('Simular valor');
    expect(tree).toContain('Duração do procedimento');
    expect(tree).toContain('Local do atendimento');
    expect(tree).toContain('Insumos previstos');
    expect(tree).toContain('Salvar simulação');
    expect(tree).toContain('Limpar campos');
  });

  it('renders unconfigured state when estimateProcedure rejects with PRICING_SETTINGS_NOT_FOUND', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockRejectedValue(
      new ApiError('Not found', 'PRICING_SETTINGS_NOT_FOUND', 404),
    );

    await savedProcedureEstimateService.save(ACCOUNT.id, {
      hours: '1',
      minutes: '30',
      client: null,
      supplies: [],
      estimate: null,
      savedAt: '2026-11-09T10:00:00.000Z',
    });

    const rendered = await renderScreen({ visible: true });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const tree = JSON.stringify(rendered.toJSON());
    expect(tree).toContain('Configure seu valor por hora');
    expect(tree).toContain('Configurar honorários');
    expect(tree).toContain('Duração do procedimento');
    expect(tree).toContain('Local do atendimento');
    expect(tree).toContain('Insumos previstos');
  });
});

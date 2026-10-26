import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { HourlyRateScreen } from './HourlyRateScreen';
import {
  OCTOBER_40_HOURS_HOURLY_RATE,
  OCTOBER_HOURLY_RATE,
  SEPTEMBER_HOURLY_RATE,
} from '../domain/hourlyRate.fixture';
import { pricingService } from '../services/pricingService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('../services/pricingService', () => ({
  pricingService: { getHourlyRate: jest.fn(), saveSettings: jest.fn() },
}));
// The fixed costs card reads its service from inside the calculator
// feature, so the mock replaces that module, not the public index.
jest.mock('features/calculator/services/fixedCostsSummaryService', () => ({
  fetchFixedCostsSummary: jest.fn(),
}));

const fixedCostsService = jest.requireMock(
  'features/calculator/services/fixedCostsSummaryService',
) as Record<'fetchFixedCostsSummary', jest.Mock>;

const getHourlyRate = pricingService.getHourlyRate as jest.Mock;
const saveSettings = pricingService.saveSettings as jest.Mock;
const fetchSummary = fixedCostsService.fetchFixedCostsSummary;

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

const NOW = new Date(2026, 9, 19, 17, 42);
const OCTOBER = { month: 10, year: 2026 };
const SEPTEMBER = { month: 9, year: 2026 };
const SETTINGS = {
  monthlyIncomeGoal: 8000,
  weeklyHours: 30,
  safetyMarginPct: 20,
};

const SUMMARY = {
  professionalExpenses: 1225,
  personalExpenses: 860,
  equipmentDepreciation: 189.08,
  transportCost: 350,
  total: 2624.08,
};

// The answer of the backend for that month, calculated "now".
function rateFor(month: MonthPeriod, rate = OCTOBER_HOURLY_RATE) {
  return { ...rate, month, calculatedAt: NOW.toISOString() };
}

const nbsp = (value: string) => value.replace(' ', '\u00a0');

async function renderScreen(onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <HourlyRateScreen visible onClose={onClose} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  const texts = () =>
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children)
      .flat()
      .map(String);
  const pressable = (label: string) =>
    renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label ||
          node
            .findAllByType('Text' as never)
            .some(text => text.props.children === label)),
    );
  const press = async (label: string) => {
    await act(async () => pressable(label).props.onPress());
  };
  const input = (label: string) =>
    renderer.root.find(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onChangeText === 'function',
    );
  const typeAndBlur = async (label: string, text: string) => {
    await act(async () => input(label).props.onChangeText(text));
    await act(async () => input(label).props.onBlur());
  };

  return { renderer, onClose, texts, press, input, typeAndBlur };
}

beforeAll(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      'nextTick',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'hrtime',
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  getHourlyRate
    .mockReset()
    .mockImplementation(async (_token, month: MonthPeriod) =>
      rateFor(
        month,
        month.month === 9 ? SEPTEMBER_HOURLY_RATE : OCTOBER_HOURLY_RATE,
      ),
    );
  saveSettings
    .mockReset()
    .mockImplementation((_token, dto) => Promise.resolve(dto));
  fetchSummary.mockReset().mockResolvedValue(SUMMARY);
});

describe('configured', () => {
  test('shows the hourly rate of the current month in the highlight', async () => {
    const { texts } = await renderScreen();

    expect(getHourlyRate).toHaveBeenCalledWith('id-token', OCTOBER);
    expect(texts()).toEqual(
      expect.arrayContaining([
        'Calculadora de hora',
        'Outubro 2026',
        'Mês atual',
        'Valor da sua hora',
        '20% de margem',
        nbsp('R$ 98,07'),
        'Mínimo (sem margem)',
        nbsp('R$ 81,72'),
        'Horas produtivas',
        '130 h',
        'Atualizado em 19/10/2026 às 17:42',
        'Ver detalhamento do cálculo',
      ]),
    );
  });

  test('keeps the breakdown closed until asked, then lists each part with its share', async () => {
    const { texts, press } = await renderScreen();

    expect(texts()).not.toContain('Composição do total mensal');

    await press('Ver detalhamento do cálculo');

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Ocultar detalhamento',
        'Composição do total mensal',
        'Custos fixos',
        'Custos fixos do mês + depreciação',
        nbsp('R$ 1.399,08'),
        '11,0% do total',
        'Custos variáveis',
        nbsp('R$ 1.225,00'),
        '9,6% do total',
        'Pró-labore',
        nbsp('R$ 8.000,00'),
        '62,7% do total',
        'Margem de segurança',
        '20% sobre custos + pró-labore',
        nbsp('R$ 2.124,82'),
        '16,7% do total',
        'Como o valor da hora é calculado?',
      ]),
    );
  });

  test('explains the math only when asked', async () => {
    const { texts, press } = await renderScreen();
    await press('Ver detalhamento do cálculo');

    expect(texts().join(' ')).not.toContain('52 semanas');

    await press('Como o valor da hora é calculado?');

    expect(texts().join(' ')).toContain('52 semanas');
  });

  test('recalculates with the costs of the month that was picked', async () => {
    const { texts, press } = await renderScreen();

    await press('Mês anterior');

    expect(getHourlyRate).toHaveBeenLastCalledWith('id-token', SEPTEMBER);
    expect(fetchSummary).toHaveBeenLastCalledWith('id-token', SEPTEMBER);
    expect(texts()).toEqual(
      expect.arrayContaining([
        'Setembro 2026',
        nbsp('R$ 95,81'),
        nbsp('R$ 79,84'),
      ]),
    );
    expect(texts().filter(text => text === 'Mês anterior')).toHaveLength(1);

    await press('Próximo mês');
    await press('Próximo mês');

    expect(getHourlyRate).toHaveBeenLastCalledWith('id-token', {
      month: 11,
      year: 2026,
    });
    expect(texts()).toContain('Novembro 2026');
  });

  test('recalculates when a goal is saved, without leaving the screen', async () => {
    getHourlyRate.mockResolvedValueOnce(rateFor(OCTOBER));
    const { texts, typeAndBlur } = await renderScreen();
    getHourlyRate.mockResolvedValueOnce(
      rateFor(OCTOBER, OCTOBER_40_HOURS_HOURLY_RATE),
    );

    await typeAndBlur('Horas disponíveis por semana', '40');

    expect(saveSettings).toHaveBeenCalledWith('id-token', {
      ...SETTINGS,
      weeklyHours: 40,
    });
    expect(getHourlyRate).toHaveBeenCalledTimes(2);
    expect(texts()).toContain(nbsp('R$ 73,55'));
  });

  test('does not save nor recalculate when a goal loses focus unchanged', async () => {
    const { input } = await renderScreen();

    await act(async () => input('Margem de segurança (%)').props.onBlur());

    expect(saveSettings).not.toHaveBeenCalled();
    expect(getHourlyRate).toHaveBeenCalledTimes(1);
  });

  test('shows a goal error under its field and keeps the rate', async () => {
    const { texts, typeAndBlur } = await renderScreen();

    await typeAndBlur('Margem de segurança (%)', '120');

    expect(saveSettings).not.toHaveBeenCalled();
    expect(texts()).toContain('A margem deve ficar entre 0% e 100%');
    expect(texts()).toContain(nbsp('R$ 98,07'));
  });

  test('lists the fixed costs as the Figma draws them', async () => {
    const { texts, input } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Metas',
        'Custos fixos mensais',
        'Despesas pessoais (mês)',
        nbsp('R$ 860,00'),
        'Depreciação de equipamentos',
        nbsp('R$ 189,08'),
        'Custo de transporte/veículo',
        nbsp('R$ 350,00'),
        'Total de custos fixos',
        nbsp('R$ 1.399,08'),
      ]),
    );
    expect(texts()).not.toContain('Despesas profissionais (mês)');
    expect(texts()).not.toContain('Ver lista de custos fixos');
    expect(texts()).not.toContain('automático · do app');
    expect(input('Horas disponíveis por semana').props.value).toBe('30');
  });

  test('offers a retry when the rate cannot be calculated', async () => {
    getHourlyRate.mockRejectedValueOnce(new Error('offline'));
    const { texts, press } = await renderScreen();

    expect(texts()).toContain('Não foi possível calcular o valor da sua hora.');

    await press('Tentar novamente');

    expect(texts()).toContain(nbsp('R$ 98,07'));
  });
});

describe('not configured', () => {
  beforeEach(() => {
    getHourlyRate.mockResolvedValue(null);
    fetchSummary.mockResolvedValue({ ...SUMMARY, transportCost: 0 });
  });

  test('shows the initial state with what the calculator needs', async () => {
    const { texts } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Configure seus honorários',
        'Meta de renda mensal (R$)',
        'Pró-labore + lucro desejado',
        'Horas disponíveis por semana',
        'Considere também os períodos ociosos',
        'Margem de segurança (%)',
        'Reserva para imprevistos, de 0 a 100%',
        'Configurar',
      ]),
    );
    expect(texts()).not.toContain('Valor da sua hora');
    expect(texts()).not.toContain('Outubro 2026');
  });

  test('opens the setup and comes back with the back button', async () => {
    const { texts, press, onClose } = await renderScreen();

    await press('Configurar');

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Configurar honorários',
        'Inclui o pró-labore e o lucro desejado',
        'Entre 0 e 100%',
        'Despesas pessoais (mês)',
        nbsp('R$ 1.049,08'),
        'Custo de transporte/veículo',
        'Salvar e calcular',
        'Você pode alterar esses dados depois, na própria calculadora.',
      ]),
    );

    await press('Voltar');

    expect(texts()).toContain('Configure seus honorários');
    expect(onClose).not.toHaveBeenCalled();
  });

  test('saves the goals and shows the calculated rate', async () => {
    const { texts, press, input } = await renderScreen();
    await press('Configurar');

    await act(async () =>
      input('Meta de renda líquida mensal (R$)').props.onChangeText('8.000'),
    );
    await act(async () =>
      input('Horas disponíveis por semana').props.onChangeText('30'),
    );
    await act(async () =>
      input('Margem de segurança (%)').props.onChangeText('20'),
    );
    getHourlyRate.mockResolvedValueOnce(rateFor(OCTOBER));
    await press('Salvar e calcular');

    expect(saveSettings).toHaveBeenCalledWith('id-token', SETTINGS);
    expect(texts()).toContain('Calculadora de hora');
    expect(texts()).toContain(nbsp('R$ 98,07'));
  });

  test('stays on the setup while a goal is missing', async () => {
    const { texts, press } = await renderScreen();
    await press('Configurar');

    await press('Salvar e calcular');

    expect(saveSettings).not.toHaveBeenCalled();
    expect(texts()).toContain('Configurar honorários');
    expect(texts()).toContain('Preencha este campo');
  });
});

test('closes from the back button of the calculator', async () => {
  const { press, onClose } = await renderScreen();

  await press('Voltar');

  expect(onClose).toHaveBeenCalledTimes(1);
});

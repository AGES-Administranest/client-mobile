import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { CalculatorScreen } from './CalculatorScreen';
import type { FixedCostsSummary } from '../domain/fixedCostsSummary';
import {
  fetchFixedCostsSummary,
  updateTransportCost,
} from '../services/fixedCostsSummaryService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('../services/fixedCostsSummaryService', () => ({
  fetchFixedCostsSummary: jest.fn(),
  updateTransportCost: jest.fn(),
}));

const fetchSummary = fetchFixedCostsSummary as jest.Mock;
const updateTransport = updateTransportCost as jest.Mock;

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

const SUMMARY: FixedCostsSummary = {
  professionalExpenses: 1225,
  personalExpenses: 860,
  equipmentDepreciation: 189.08,
  transportCost: 350,
  total: 2624.08,
};

const ZERO_SUMMARY: FixedCostsSummary = {
  professionalExpenses: 0,
  personalExpenses: 0,
  equipmentDepreciation: 0,
  transportCost: 0,
  total: 0,
};

async function renderScreen(visible = true, onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <CalculatorScreen visible={visible} onClose={onClose} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return { renderer, onClose };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .map(String);
}

function transportInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Transporte / Veículo (R$/mês)' &&
      typeof node.props.onChangeText === 'function',
  );
}

async function typeAndBlur(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  await act(async () => transportInput(renderer).props.onChangeText(text));
  await act(async () => transportInput(renderer).props.onBlur());
}

const nbsp = (value: string) => value.replace(' ', ' ');

beforeEach(() => {
  fetchSummary.mockReset().mockResolvedValue(SUMMARY);
  updateTransport.mockReset();
});

test('shows the title and the subtitle', async () => {
  const { renderer } = await renderScreen();

  const texts = textsOf(renderer);

  expect(texts).toContain('Calculadora de hora');
  expect(texts).toContain(
    'Descubra o valor mínimo que deve cobrar por hora trabalhada',
  );
});

test('closes when the back button is pressed', async () => {
  const { renderer, onClose } = await renderScreen();

  const back = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Voltar' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => back.props.onPress());

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('renders nothing while hidden', async () => {
  const { renderer } = await renderScreen(false);

  expect(textsOf(renderer)).not.toContain('Calculadora de hora');
});

test('lists the fixed costs in reais with the backend total', async () => {
  const { renderer } = await renderScreen();

  const texts = textsOf(renderer);

  expect(texts).toContain('Custos fixos mensais');
  expect(texts).toContain('Despesas profissionais (mês)');
  expect(texts).toContain('Despesas pessoais (mês)');
  expect(texts).toContain('Depreciação de equipamentos');
  expect(texts).toContain('Custo de transporte/veículo');
  expect(texts.filter(text => text === 'automático · do app')).toHaveLength(3);
  expect(texts).toContain(nbsp('R$ 1.225,00'));
  expect(texts).toContain(nbsp('R$ 860,00'));
  expect(texts).toContain(nbsp('R$ 189,08'));
  expect(texts).toContain(nbsp('R$ 350,00'));
  expect(texts).toContain(nbsp('R$ 2.624,08'));
  expect(texts).toContain(
    'Registre deslocamentos como despesa na aba Finanças',
  );
  expect(transportInput(renderer).props.value).toBe('350,00');
});

test('shows zeroed values when there is nothing yet', async () => {
  fetchSummary.mockResolvedValue(ZERO_SUMMARY);

  const { renderer } = await renderScreen();

  expect(
    textsOf(renderer).filter(text => text === nbsp('R$ 0,00')),
  ).toHaveLength(5);
  expect(transportInput(renderer).props.value).toBe('0,00');
});

test('saves the transport on blur and takes line and total from the response', async () => {
  updateTransport.mockResolvedValue({
    ...SUMMARY,
    transportCost: 400,
    total: 2674.08,
  });

  const { renderer } = await renderScreen();

  await typeAndBlur(renderer, '40000');

  expect(updateTransport).toHaveBeenCalledWith('id-token', 400);
  expect(transportInput(renderer).props.value).toBe('400,00');
  expect(textsOf(renderer)).toContain(nbsp('R$ 400,00'));
  expect(textsOf(renderer)).toContain(nbsp('R$ 2.674,08'));
});

test('allows zero', async () => {
  updateTransport.mockResolvedValue({
    ...SUMMARY,
    transportCost: 0,
    total: 2274.08,
  });

  const { renderer } = await renderScreen();

  await typeAndBlur(renderer, '0');

  expect(updateTransport).toHaveBeenCalledWith('id-token', 0);
});

test('refuses an empty value without saving', async () => {
  const { renderer } = await renderScreen();

  await typeAndBlur(renderer, '');

  expect(updateTransport).not.toHaveBeenCalled();
  expect(textsOf(renderer)).toContain(
    'Informe o valor do transporte (use 0 se não houver).',
  );
});

test('refuses a negative value without saving', async () => {
  const { renderer } = await renderScreen();

  await typeAndBlur(renderer, '-500');

  expect(updateTransport).not.toHaveBeenCalled();
  expect(textsOf(renderer)).toContain('O valor não pode ser negativo.');
});

test('does not save when the value did not change', async () => {
  const { renderer } = await renderScreen();

  await act(async () => transportInput(renderer).props.onBlur());

  expect(updateTransport).not.toHaveBeenCalled();
});

test('keeps the previous value and warns when saving fails', async () => {
  updateTransport.mockRejectedValue(new Error('offline'));

  const { renderer } = await renderScreen();

  await typeAndBlur(renderer, '90000');

  expect(transportInput(renderer).props.value).toBe('350,00');
  expect(textsOf(renderer)).toContain(nbsp('R$ 2.624,08'));
  expect(textsOf(renderer)).toContain(
    'Não foi possível salvar. O valor anterior foi mantido.',
  );
});

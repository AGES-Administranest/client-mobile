import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { PricingGoalsSection } from './PricingGoalsSection';
import {
  usePricingSettings,
  type PricingSettingsState,
} from '../hooks/usePricingSettings';
import { pricingService } from '../services/pricingService';
import { fetchPricingSettings } from '../services/pricingSettingsService';

jest.mock('../services/pricingService', () => ({
  pricingService: { saveSettings: jest.fn() },
}));
jest.mock('../services/pricingSettingsService', () => ({
  fetchPricingSettings: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const saveSettings = pricingService.saveSettings as jest.Mock;
const fetchSettings = fetchPricingSettings as jest.Mock;

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

const SAVED = {
  monthlyIncomeGoal: 8000.5,
  weeklyHours: 37.5,
  safetyMarginPct: 10,
};

// The section reads the settings state from its parent; this one exposes it
// so a test can see what saving the goals hands back.
const pricingState = { current: null as PricingSettingsState | null };

function Section() {
  const pricing = usePricingSettings();
  pricingState.current = pricing.state;
  return <PricingGoalsSection pricing={pricing} />;
}

async function renderSection() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <Section />
        </AuthProvider>
      </I18nProvider>,
    );
  });
  return renderer;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => String(node.props.children));
}

function input(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
}

async function type(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  await act(async () => input(renderer, label).props.onChangeText(value));
}

async function pressSave(renderer: ReactTestRenderer.ReactTestRenderer) {
  const save = renderer.root
    .findAll(node => node.props?.role === 'button' && !!node.props.onPress)
    .pop()!;
  await act(async () => save.props.onPress());
}

beforeEach(() => {
  fetchSettings.mockReset().mockResolvedValue(null);
  saveSettings
    .mockReset()
    .mockImplementation((_token, dto) => Promise.resolve(dto));
});

test('shows the goals card with its translated labels', async () => {
  const renderer = await renderSection();

  const texts = textsOf(renderer);

  expect(texts).toContain('Metas');
  expect(texts).toContain('Meta de renda líquida mensal (R$)');
  expect(texts).toContain('Horas disponíveis por semana');
  expect(texts).toContain('Margem de segurança (%)');
  expect(texts).toContain('Salvar metas');
});

test('translates each field error instead of saving an empty form', async () => {
  const renderer = await renderSection();

  await pressSave(renderer);

  expect(saveSettings).not.toHaveBeenCalled();
  expect(
    textsOf(renderer).filter(text => text === 'Preencha este campo'),
  ).toHaveLength(3);
});

test('saves the parsed goals with the id token', async () => {
  const renderer = await renderSection();

  await type(renderer, 'Meta de renda líquida mensal (R$)', '8.000,50');
  await type(renderer, 'Horas disponíveis por semana', '30');
  await type(renderer, 'Margem de segurança (%)', '20');
  await pressSave(renderer);

  expect(saveSettings).toHaveBeenCalledWith('id-token', {
    monthlyIncomeGoal: 8000.5,
    weeklyHours: 30,
    safetyMarginPct: 20,
  });
});

test('says the save failed when the service rejects', async () => {
  saveSettings.mockRejectedValue(new Error('offline'));
  const renderer = await renderSection();

  await type(renderer, 'Meta de renda líquida mensal (R$)', '8000');
  await type(renderer, 'Horas disponíveis por semana', '30');
  await type(renderer, 'Margem de segurança (%)', '20');
  await pressSave(renderer);

  expect(textsOf(renderer)).toContain(
    'Não foi possível salvar as metas. Tente novamente.',
  );
});

test('opens with the saved goals filled in, in pt-BR format', async () => {
  fetchSettings.mockResolvedValue(SAVED);

  const renderer = await renderSection();

  expect(input(renderer, 'Meta de renda líquida mensal (R$)').props.value).toBe(
    '8000,5',
  );
  expect(input(renderer, 'Horas disponíveis por semana').props.value).toBe(
    '37,5',
  );
  expect(input(renderer, 'Margem de segurança (%)').props.value).toBe('10');
});

test('marks the goals as configured with what the API saved', async () => {
  saveSettings.mockResolvedValue(SAVED);
  const renderer = await renderSection();
  expect(pricingState.current).toEqual({ status: 'unconfigured' });

  await type(renderer, 'Meta de renda líquida mensal (R$)', '8000,5');
  await type(renderer, 'Horas disponíveis por semana', '37,5');
  await type(renderer, 'Margem de segurança (%)', '10');
  await pressSave(renderer);

  expect(pricingState.current).toEqual({
    status: 'configured',
    settings: SAVED,
  });
  expect(fetchSettings).toHaveBeenCalledTimes(1);
});

test('shows no form until the saved goals are known', async () => {
  fetchSettings.mockReturnValue(new Promise(() => {}));

  const renderer = await renderSection();

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('shows no empty form when the goals could not be loaded', async () => {
  fetchSettings.mockRejectedValue(new ApiError('boom', null, 500));

  const renderer = await renderSection();

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

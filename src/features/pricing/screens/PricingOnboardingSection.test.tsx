import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { PricingOnboardingSection } from './PricingOnboardingSection';
import { fetchPricingSettings } from '../services/pricingSettingsService';

jest.mock('../services/pricingSettingsService', () => ({
  fetchPricingSettings: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

const SETTINGS = {
  monthlyIncomeGoal: 8000,
  weeklyHours: 40,
  safetyMarginPct: 10,
};

async function renderSection(onConfigure = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <PricingOnboardingSection onConfigure={onConfigure} />
        </AuthProvider>
      </I18nProvider>,
    );
  });
  return { renderer, onConfigure };
}

function textsIn(node: ReactTestRenderer.ReactTestInstance) {
  return node
    .findAllByType('Text' as never)
    .map(text => String(text.props.children))
    .join(' ');
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return textsIn(renderer.root);
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(node => typeof node.props?.onPress === 'function')
    .filter(node => textsIn(node).includes(label))
    .pop()!;
}

beforeEach(() => {
  fetchSettings.mockReset();
});

test('explains the goals and offers "Configurar" when nothing is set up', async () => {
  fetchSettings.mockResolvedValue(null);

  const { renderer, onConfigure } = await renderSection();

  expect(textsOf(renderer)).toContain(
    'Para calcular o valor mínimo da sua hora',
  );

  await act(async () => {
    pressableWithText(renderer, 'Configurar').props.onPress();
  });
  expect(onConfigure).toHaveBeenCalledTimes(1);
});

test('shows nothing once the goals are set up', async () => {
  fetchSettings.mockResolvedValue(SETTINGS);

  const { renderer } = await renderSection();

  expect(renderer.toJSON()).toBeNull();
});

test('offers a retry, not the setup guide, when loading fails', async () => {
  fetchSettings
    .mockRejectedValueOnce(new ApiError('boom', null, 500))
    .mockResolvedValueOnce(null);

  const { renderer } = await renderSection();

  expect(textsOf(renderer)).toContain('Não foi possível carregar suas metas.');
  expect(textsOf(renderer)).not.toContain('Configurar');

  await act(async () => {
    pressableWithText(renderer, 'Tentar novamente').props.onPress();
  });

  expect(fetchSettings).toHaveBeenCalledTimes(2);
  expect(textsOf(renderer)).toContain('Configurar');
});

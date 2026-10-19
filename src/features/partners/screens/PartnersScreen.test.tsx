import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { PartnersScreen } from './PartnersScreen';

jest.mock('features/clinics/services/clientService', () => ({
  fetchClinics: jest.fn().mockResolvedValue([]),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider
            initialSession={{
              idToken: 'id-token',
              accessToken: 'access',
              refreshToken: 'refresh',
              expiresAt: 1,
            }}
            initialAccount={{
              id: 'user-1',
              name: 'Bruna Senha',
              email: 'bruna@example.com',
              termsAcceptedAt: '2026-09-13T12:00:00.000Z',
              termsVersion: TERMS_VERSION,
            }}
          >
            <PartnersScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

test('starts on the clinics segment with the add button', async () => {
  const texts = textsOf(await renderScreen());

  expect(texts).toContain('Nenhuma clínica cadastrada.');
  expect(texts).toContain('Adicionar clínica');
});

test('switching to suppliers hides the clinics content', async () => {
  const renderer = await renderScreen();
  const [suppliersTab] = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === 'Fornecedores'),
  );

  await act(async () => {
    suppliersTab.props.onPress();
  });

  expect(textsOf(renderer)).not.toContain('Adicionar clínica');
});

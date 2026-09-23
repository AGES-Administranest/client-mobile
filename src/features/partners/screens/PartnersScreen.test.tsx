import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { PartnersScreen } from './PartnersScreen';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'token' } }),
}));

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <PartnersScreen />
      </I18nProvider>,
    );
  });
  return renderer!;
}

test('lists the clinics with their count and location', async () => {
  const renderer = await renderScreen();
  const texts = textsOf(renderer);

  expect(texts).toContain('4 clínicas');
  expect(texts).toContain('Clínica VetNova');
  expect(texts).toContain('São Paulo, SP');
});

test('switching to suppliers hides the clinic list', async () => {
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

  expect(textsOf(renderer)).not.toContain('Clínica VetNova');
});

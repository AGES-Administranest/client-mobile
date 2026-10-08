import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { CalculatorScreen } from './CalculatorScreen';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(visible: boolean, onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <CalculatorScreen visible={visible} onClose={onClose} />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return { renderer, onClose };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
}

test('shows the title and the subtitle', () => {
  const { renderer } = renderScreen(true);

  const texts = textsOf(renderer);

  expect(texts).toContain('Calculadora de hora');
  expect(texts).toContain(
    'Descubra o valor mínimo que deve cobrar por hora trabalhada',
  );
});

test('closes when the back button is pressed', () => {
  const { renderer, onClose } = renderScreen(true);

  const back = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Voltar' &&
      typeof node.props.onPress === 'function',
  );

  act(() => back.props.onPress());

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('renders nothing while hidden', () => {
  const { renderer } = renderScreen(false);

  expect(textsOf(renderer)).not.toContain('Calculadora de hora');
});

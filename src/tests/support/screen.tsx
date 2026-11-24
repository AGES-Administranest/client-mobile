import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
} from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { unmountAfterEach } from './unmountAfterEach';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const inApp = (element: ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <I18nProvider>{element}</I18nProvider>
  </SafeAreaProvider>
);

/** The text a user reads inside an element. */
function textOf(node: ReactTestInstance | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

export type Screen = {
  root: ReactTestInstance;
  /** Everything written on the screen, in order. */
  text: () => string;
  has: (text: string) => boolean;
  /** Presses the closest pressable whose label or text is exactly `label`. */
  press: (label: string) => Promise<void>;
  isDisabled: (label: string) => boolean;
  /** Types in the field with this accessibility label or placeholder. */
  type: (field: string, value: string) => Promise<void>;
  valueOf: (field: string) => string | undefined;
  act: (run: () => unknown) => Promise<void>;
  update: (element: ReactElement) => Promise<void>;
  unmount: () => void;
};

export async function renderScreen(element: ReactElement): Promise<Screen> {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(inApp(element));
  });
  const unmount = unmountAfterEach(renderer);
  const { root } = renderer;

  const pressablesNamed = (label: string) =>
    root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label || textOf(node) === label),
    );

  // The deepest match is the native element; its handler is the one a real
  // press reaches, whatever the number of wrapping components.
  const pressable = (label: string) => {
    const found = pressablesNamed(label);
    if (found.length === 0) {
      throw new Error(`Nothing to press named "${label}" in: ${textOf(root)}`);
    }
    return found[found.length - 1];
  };

  const field = (name: string) => {
    const found = root.findAll(
      node =>
        typeof node.props.onChangeText === 'function' &&
        (node.props.accessibilityLabel === name ||
          node.props.placeholder === name),
    );
    if (found.length === 0) {
      throw new Error(`No field named "${name}" in: ${textOf(root)}`);
    }
    return found[found.length - 1];
  };

  return {
    root,
    text: () => textOf(root),
    has: text => textOf(root).includes(text),
    press: async label => {
      await act(async () => {
        await pressable(label).props.onPress();
      });
    },
    isDisabled: label =>
      pressablesNamed(label).some(node => node.props.disabled === true),
    type: async (name, value) => {
      await act(async () => {
        field(name).props.onChangeText(value);
      });
    },
    valueOf: name => field(name).props.value,
    act: async run => {
      await act(async () => {
        await run();
      });
    },
    update: async next => {
      await act(async () => {
        renderer.update(inApp(next));
      });
    },
    unmount,
  };
}

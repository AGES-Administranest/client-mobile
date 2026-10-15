import { Modal, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { BottomSheet } from 'app/components/ui/bottom-sheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Renderer = ReactTestRenderer.ReactTestRenderer;

async function renderSheet(visible: boolean) {
  const onClose = jest.fn();
  const onClosed = jest.fn();
  const sheet = (open: boolean) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <BottomSheet
        visible={open}
        title="Novo lançamento manual"
        closeLabel="Fechar"
        onClose={onClose}
        onClosed={onClosed}
        footer={<Text>Salvar</Text>}
      >
        <Text>Descrição</Text>
      </BottomSheet>
    </SafeAreaProvider>
  );
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(sheet(visible));
  });
  const setVisible = (open: boolean) =>
    act(async () => renderer.update(sheet(open)));
  return { renderer: renderer!, setVisible, onClose, onClosed };
}

const textsOf = (renderer: Renderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

const headerTexts = (renderer: Renderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .filter(node => node.props.accessibilityRole === 'header')
    .map(node => node.props.children);

test('shows the title as a header, then the body and the footer', async () => {
  const { renderer } = await renderSheet(true);

  expect(headerTexts(renderer)).toEqual(['Novo lançamento manual']);
  expect(textsOf(renderer)).toEqual([
    'Novo lançamento manual',
    'Descrição',
    'Salvar',
  ]);
});

test('names the dialog after its title for the web', async () => {
  const { renderer } = await renderSheet(true);

  expect(renderer.root.findByType(Modal).props['aria-label']).toBe(
    'Novo lançamento manual',
  );
});

test('renders nothing while closed', async () => {
  const { renderer } = await renderSheet(false);

  expect(textsOf(renderer)).toEqual([]);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Fechar' }),
  ).toEqual([]);
});

test.each([
  [
    'the dimmed backdrop',
    (renderer: Renderer) =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Fechar' })
        .props.onPress(),
  ],
  [
    'the Android back button',
    (renderer: Renderer) =>
      renderer.root.findByType(Modal).props.onRequestClose(),
  ],
  [
    'the VoiceOver escape gesture',
    (renderer: Renderer) =>
      renderer.root
        .findAll(
          node => typeof node.props.onAccessibilityEscape === 'function',
        )[0]
        .props.onAccessibilityEscape(),
  ],
])('asks to close from %s', async (_path, close) => {
  const { renderer, onClose } = await renderSheet(true);

  await act(async () => close(renderer));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('reports once that it finished closing, so the next sheet can open', async () => {
  const { setVisible, onClosed } = await renderSheet(true);
  expect(onClosed).not.toHaveBeenCalled();

  await setVisible(false);
  await setVisible(false);

  expect(onClosed).toHaveBeenCalledTimes(1);
});

test('does not report a close when it mounts closed', async () => {
  const { onClosed } = await renderSheet(false);

  expect(onClosed).not.toHaveBeenCalled();
});

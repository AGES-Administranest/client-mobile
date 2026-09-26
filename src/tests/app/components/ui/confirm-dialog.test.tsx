import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

// O diálogo anima por timers (useSheetAnimation); desmontar a para antes de o
// Jest derrubar o ambiente.
afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

async function renderDialog(onConfirm = () => {}, onCancel = () => {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ConfirmDialog
        visible
        title="Descartar alterações?"
        message="O que você preencheu neste atendimento será perdido."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
  });
  mounted.push(renderer!);
  return renderer!;
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(node => typeof node.props?.onPress === 'function')
    .filter(node =>
      JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      ).includes(label),
    )
    .pop()!;
}

test('fica centralizado na tela, não preso ao rodapé', async () => {
  const renderer = await renderDialog();

  const container = renderer.root.find(
    node =>
      typeof node.props?.className === 'string' &&
      node.props.className.includes('justify-center'),
  );

  expect(container.props.className).toContain('items-center');
});

test('escurece a tela inteira por trás', async () => {
  const renderer = await renderDialog();

  const backdrop = renderer.root.find(
    node =>
      Array.isArray(node.props?.style) &&
      node.props.style[0] === StyleSheet.absoluteFill &&
      node.props.pointerEvents === 'none',
  );

  expect(backdrop).toBeTruthy();
});

test('confirmar, cancelar e tocar fora chamam o handler certo', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const renderer = await renderDialog(onConfirm, onCancel);

  await act(async () => {
    pressableWithText(renderer, 'Descartar').props.onPress();
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);

  await act(async () => {
    pressableWithText(renderer, 'Continuar editando').props.onPress();
  });
  expect(onCancel).toHaveBeenCalledTimes(1);

  const outside = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Continuar editando' &&
      node.props?.style === StyleSheet.absoluteFill &&
      typeof node.props?.onPress === 'function',
  );

  await act(async () => {
    outside.props.onPress();
  });
  expect(onCancel).toHaveBeenCalledTimes(2);
});

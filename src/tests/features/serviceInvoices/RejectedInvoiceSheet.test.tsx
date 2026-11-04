import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { RejectedInvoiceSheet } from 'features/serviceInvoices/components/RejectedInvoiceSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function render({ sendAnyway }: { sendAnyway?: () => void } = {}) {
  const onDiscard = jest.fn();
  const onKeep = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <RejectedInvoiceSheet
          visible
          title="Nota não enviada"
          closeLabel="Manter na fila"
          message="A nota não foi enviada."
          discardLabel="Descartar nota"
          keepLabel="Manter na fila"
          sendAnyway={
            sendAnyway && { label: 'Enviar mesmo assim', onPress: sendAnyway }
          }
          onDiscard={onDiscard}
          onKeep={onKeep}
        />
      </SafeAreaProvider>,
    );
  });
  return { renderer, onDiscard, onKeep };
}

function button(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  const matches = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props.children === label,
      ).length > 0,
  );
  return matches[matches.length - 1];
}

describe('RejectedInvoiceSheet', () => {
  it('uses the palette of the confirm sheet: button-secondary red for the action that deletes, the default brown for keeping', () => {
    const { renderer } = render();

    const discard = renderer.root.find(
      node =>
        node.props.variant === 'secondary' &&
        typeof node.props.onPress === 'function',
    );
    const keep = renderer.root.find(
      node =>
        node.props.variant === undefined &&
        typeof node.props.onPress === 'function' &&
        node.props.icon !== undefined &&
        node.findAll(
          n =>
            typeof n.type === 'string' && n.props.children === 'Manter na fila',
        ).length > 0,
    );

    expect(
      discard.findAll(
        n =>
          typeof n.type === 'string' && n.props.children === 'Descartar nota',
      ),
    ).toHaveLength(1);
    expect(
      keep.findAll(
        n =>
          typeof n.type === 'string' && n.props.children === 'Manter na fila',
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll(
        node =>
          node.props.variant === 'destructive' ||
          node.props.variant === 'outline',
      ),
    ).toHaveLength(0);
  });

  it('discards only from the red button', () => {
    const { renderer, onDiscard, onKeep } = render();

    act(() => button(renderer, 'Descartar nota').props.onPress());

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onKeep).not.toHaveBeenCalled();
  });

  it('keeps from its button, and from tapping outside or dragging down', () => {
    const { renderer, onDiscard, onKeep } = render();

    act(() => button(renderer, 'Manter na fila').props.onPress());
    act(() => renderer.root.findByType(BottomSheet).props.onClose());

    expect(onKeep).toHaveBeenCalledTimes(2);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('offers to send it anyway only when given that action', () => {
    expect(button(render().renderer, 'Enviar mesmo assim')).toBeUndefined();

    const sendAnyway = jest.fn();
    const { renderer } = render({ sendAnyway });
    act(() => {
      button(renderer, 'Enviar mesmo assim').props.onPress();
    });

    expect(sendAnyway).toHaveBeenCalledTimes(1);
  });
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import { InvoiceCard, type InvoiceStatusTone } from './InvoiceCard';

function renderCard(
  props: Partial<{ statusTone: InvoiceStatusTone; onPress: () => void }> = {},
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <InvoiceCard
        title="Nota Fiscal 000458"
        date="10/08/2026"
        issuer="Emitente: Vet Farma Distribuidora"
        taker="Tomador: Clínica Veterinária Boa Vida"
        value="R$ 1.284,50"
        statusLabel="Sincronizada"
        statusTone="success"
        onPress={jest.fn()}
        {...props}
      />,
    );
  });

  return renderer;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

describe('InvoiceCard', () => {
  it('shows the number, date, parties, value and status it was given', () => {
    const texts = textsOf(renderCard());

    expect(texts).toContain('Nota Fiscal 000458');
    expect(texts).toContain('10/08/2026');
    expect(texts).toContain('Emitente: Vet Farma Distribuidora');
    expect(texts).toContain('Tomador: Clínica Veterinária Boa Vida');
    expect(texts).toContain('R$ 1.284,50');
    expect(texts).toContain('Sincronizada');
  });

  it('opens the invoice when pressed', () => {
    const onPress = jest.fn();
    const renderer = renderCard({ onPress });
    const button = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    act(() => button.props.onPress());

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('describes the whole card to a screen reader', () => {
    const renderer = renderCard();
    const button = renderer.root.find(
      node => node.props.accessibilityRole === 'button',
    );

    expect(button.props.accessibilityLabel).toBe(
      'Nota Fiscal 000458, Sincronizada, R$ 1.284,50',
    );
  });
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import { InvoiceCard } from './InvoiceCard';

function renderCard(onPress = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <InvoiceCard
        issuer="HospVet Sul"
        date="22/04/2026"
        location="São Paulo, SP"
        onPress={onPress}
      />,
    );
  });

  return renderer;
}

describe('InvoiceCard', () => {
  it('shows the issuer, the date and the city it was given', () => {
    const texts = JSON.stringify(
      renderCard()
        .root.findAllByType('Text' as never)
        .map(node => node.props.children),
    );

    expect(texts).toContain('HospVet Sul');
    expect(texts).toContain('22/04/2026');
    expect(texts).toContain('São Paulo, SP');
  });

  it('opens the invoice when pressed', () => {
    const onPress = jest.fn();
    const button = renderCard(onPress).root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    act(() => button.props.onPress());

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('describes the whole card to a screen reader', () => {
    const button = renderCard().root.find(
      node => node.props.accessibilityRole === 'button',
    );

    expect(button.props.accessibilityLabel).toBe(
      'HospVet Sul, 22/04/2026, São Paulo, SP',
    );
  });
});

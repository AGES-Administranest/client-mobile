import ReactTestRenderer, { act } from 'react-test-renderer';

import { ReportCard } from './ReportCard';

function renderCard(downloadedLabel: string | null, onPress = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <ReportCard
        kind="Relatório geral"
        period="01/10/2026 a 31/10/2026"
        generatedAt="Gerado em 12/11/2026"
        fileName="relatorio.pdf"
        downloadedLabel={downloadedLabel}
        onPress={onPress}
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

describe('ReportCard', () => {
  it('shows the kind, the period and the generation date', () => {
    const texts = textsOf(renderCard(null));

    expect(texts).toContain('Relatório geral');
    expect(texts).toContain('01/10/2026 a 31/10/2026');
    expect(texts).toContain('Gerado em 12/11/2026');
    expect(texts).toContain('relatorio.pdf');
  });

  it('marks a report kept on the device', () => {
    expect(textsOf(renderCard('No aparelho'))).toContain('No aparelho');
    expect(textsOf(renderCard(null))).not.toContain('No aparelho');
  });

  it('opens the report when pressed', () => {
    const onPress = jest.fn();
    const button = renderCard(null, onPress).root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    act(() => button.props.onPress());

    expect(onPress).toHaveBeenCalled();
  });
});

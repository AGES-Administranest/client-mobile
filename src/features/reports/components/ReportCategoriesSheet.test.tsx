import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { Button } from 'app/components/ui/button';

import { ReportCategoriesSheet } from './ReportCategoriesSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const OPTIONS = [
  { id: 'financial', label: 'Financeiro' },
  { id: 'travel', label: 'Deslocamento' },
];

function render(props: Partial<Parameters<typeof ReportCategoriesSheet>[0]>) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ReportCategoriesSheet
          visible
          title="Selecione as categorias"
          closeLabel="Fechar"
          selectAllLabel="Selecionar tudo"
          clearAllLabel="Limpar tudo"
          generateLabel="Gerar"
          options={OPTIONS}
          selectedIds={['financial', 'travel']}
          isGenerating={false}
          onToggle={jest.fn()}
          onSelectAll={jest.fn()}
          onClearAll={jest.fn()}
          onGenerate={jest.fn()}
          onClose={jest.fn()}
          {...props}
        />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

const textOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

describe('ReportCategoriesSheet', () => {
  it('exposes selected and unselected categories to assistive technology', () => {
    const tree = render({ selectedIds: ['financial'] });
    const categories = tree.root.findAll(
      node =>
        node.props.accessibilityRole === 'checkbox' &&
        typeof node.props.onPress === 'function',
    );

    expect(categories.map(node => node.props['aria-checked'])).toEqual([
      true,
      false,
    ]);
  });

  it('shows the warning and the error it is given', () => {
    const text = textOf(
      render({
        warning: 'Seu CRMV não está preenchido no perfil.',
        error: 'Sem conexão.',
      }),
    );

    expect(text).toContain('Seu CRMV não está preenchido no perfil.');
    expect(text).toContain('Sem conexão.');
  });

  it('shows neither when there is nothing to say', () => {
    const text = textOf(render({ warning: null, error: null }));

    expect(text).not.toContain('CRMV');
    expect(text).toContain('Financeiro');
  });

  it.each([
    ['without a section', { selectedIds: [] }, true],
    ['while generating', { isGenerating: true }, true],
    ['with sections selected', {}, false],
  ])('blocks generating %s: %p', (_name, props, blocked) => {
    const tree = render(props);
    // The footer's button is the only one in the sheet.
    const [generate] = tree.root.findAllByType(Button);

    expect(Boolean(generate.props.disabled)).toBe(blocked);
  });
});

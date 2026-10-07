import { ScanText, Plus } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { OptionsModal } from 'app/components/ui/options-modal';

const OPTIONS = [
  {
    label: 'Escanear nota',
    icon: ScanText,
    variant: 'default' as const,
    onPress: jest.fn(),
  },
  {
    label: 'Digitar insumo',
    icon: Plus,
    variant: 'default' as const,
    onPress: jest.fn(),
  },
];

test('renders one button per option and calls its onPress when pressed', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <OptionsModal visible options={OPTIONS} onClose={jest.fn()} />,
    );
  });

  const buttons = renderer!.root.findAll(
    node =>
      node.props.role === 'button' && typeof node.props.onPress === 'function',
  );

  expect(buttons).toHaveLength(2);

  await act(() => {
    buttons[0].props.onPress();
  });

  expect(OPTIONS[0].onPress).toHaveBeenCalled();
});

test('shows the title and the description above the options when given', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <OptionsModal
        visible
        title="Novo lançamento"
        description="Escolha como lançar."
        options={OPTIONS}
        onClose={jest.fn()}
      />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(texts).toEqual(
    expect.arrayContaining(['Novo lançamento', 'Escolha como lançar.']),
  );
  expect(texts.indexOf('Novo lançamento')).toBeLessThan(
    texts.indexOf('Escanear nota'),
  );
});

test('keeps showing only the options when no title is given', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <OptionsModal visible options={OPTIONS} onClose={jest.fn()} />,
    );
  });

  expect(
    renderer!.root.findAll(node => node.props.accessibilityRole === 'header'),
  ).toHaveLength(0);
});

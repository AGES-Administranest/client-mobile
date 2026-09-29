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

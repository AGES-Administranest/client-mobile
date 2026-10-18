import ReactTestRenderer, { act } from 'react-test-renderer';

import { NewEntryButton } from './NewEntryButton';

test('shows the label it receives and calls onPress when pressed', async () => {
  const onPress = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NewEntryButton label="Novo lançamento" onPress={onPress} />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
  expect(texts).toContain('Novo lançamento');

  await act(() => {
    renderer!.root
      .findByProps({ testID: 'finance-new-entry-button' })
      .props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});

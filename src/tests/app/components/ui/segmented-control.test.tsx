import ReactTestRenderer, { act } from 'react-test-renderer';

import { SegmentedControl } from 'app/components/ui/segmented-control';
import { I18nProvider } from 'shared/i18n';

test('marks the active segment as selected and calls onValueChange when another segment is pressed', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <SegmentedControl value="supplies" onValueChange={onValueChange} />
      </I18nProvider>,
    );
  });

  const segments = renderer!.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );

  expect(segments).toHaveLength(2);
  expect(segments[0].props.accessibilityState).toEqual({ selected: true });
  expect(segments[1].props.accessibilityState).toEqual({ selected: false });

  await act(() => {
    segments[1].props.onPress();
  });

  expect(onValueChange).toHaveBeenCalledWith('equipment');
});

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { TabBar } from 'app/components/ui/tabbar';
import { I18nProvider } from 'shared/i18n';

test('marks the active tab as selected and calls onValueChange when another tab is pressed', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <TabBar value="day" onValueChange={onValueChange} />
      </I18nProvider>,
    );
  });

  const tabs = renderer!.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );
  expect(tabs).toHaveLength(5);
  expect(tabs[0].props.accessibilityState).toEqual({ selected: true });
  expect(tabs[2].props.accessibilityState).toEqual({ selected: false });

  await act(() => {
    tabs[2].props.onPress();
  });

  expect(onValueChange).toHaveBeenCalledWith('materials');
});

/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { App } from 'app/App';

// Without metrics SafeAreaProvider waits for a native layout event that never
// comes in tests, and renders nothing.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

test('starts on the welcome screen while signed out', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const texts = renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(JSON.stringify(texts)).toContain('Seja bem-vindo(a)');
});

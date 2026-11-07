import ReactTestRenderer, { act } from 'react-test-renderer';

import { MonthSelector } from 'shared/components/MonthSelector';

async function render(props: {
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const onPrevious = jest.fn();
  const onNext = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <MonthSelector
        label="Mai – Out 2026"
        previousLabel="Anterior"
        nextLabel="Próximo"
        onPrevious={onPrevious}
        onNext={onNext}
        {...props}
      />,
    );
  });
  const button = (label: string) =>
    renderer.root.find(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );
  return { button, onPrevious, onNext };
}

test('both arrows are enabled by default, so existing callers are unchanged', async () => {
  const { button } = await render({});

  expect(button('Anterior').props.disabled).toBeFalsy();
  expect(button('Próximo').props.disabled).toBeFalsy();
});

test('previousDisabled disables only the previous arrow', async () => {
  const { button } = await render({ previousDisabled: true });

  expect(button('Anterior').props.disabled).toBe(true);
  expect(button('Anterior').props.accessibilityState).toEqual({
    disabled: true,
  });
  expect(button('Próximo').props.disabled).toBeFalsy();
});

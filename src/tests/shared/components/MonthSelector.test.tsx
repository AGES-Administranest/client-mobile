import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  MonthSelector,
  MonthSelectorPeriod,
} from 'shared/components/MonthSelector';

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

describe('MonthSelectorPeriod', () => {
  async function renderPeriod(caption?: string | null) {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MonthSelectorPeriod label="Setembro 2026" caption={caption} />,
      );
    });
    const texts = renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const pressables = renderer.root.findAll(
      node => typeof node.props.onPress === 'function',
    );
    return { renderer, texts, pressables };
  }

  test('shows the month and its caption, with no arrows and nothing to press', async () => {
    const { texts, pressables } = await renderPeriod(
      'Valores de setembro/2026',
    );

    expect(texts).toEqual(['Setembro 2026', 'Valores de setembro/2026']);
    expect(pressables).toEqual([]);
  });

  test('is read as one element, "month, caption", and is not a button', async () => {
    const { renderer } = await renderPeriod('Valores de setembro/2026');

    const period = renderer.root.find(
      node =>
        node.props.accessibilityLabel ===
        'Setembro 2026, Valores de setembro/2026',
    );
    expect(period.props.accessible).toBe(true);
    expect(period.props.accessibilityRole).toBeUndefined();
  });

  test('with no caption it shows only the month', async () => {
    const { texts, renderer } = await renderPeriod(null);

    expect(texts).toEqual(['Setembro 2026']);
    expect(
      renderer.root.find(
        node => node.props.accessibilityLabel === 'Setembro 2026',
      ).props.accessible,
    ).toBe(true);
  });

  test('is the same middle the selector draws between its arrows', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MonthSelector
          label="Setembro 2026"
          caption="Mês anterior"
          previousLabel="Anterior"
          nextLabel="Próximo"
          onPrevious={jest.fn()}
          onNext={jest.fn()}
        />,
      );
    });

    expect(
      renderer.root.findAll(
        node => node.props.accessibilityLabel === 'Setembro 2026, Mês anterior',
      ).length,
    ).toBeGreaterThan(0);
  });
});

import { ChevronDown } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { SearchSelect } from 'app/components/ui/search-select';

type SearchSelectProps = ComponentProps<typeof SearchSelect>;

const OPTIONS = [
  { id: 'supplies', label: 'Insumos' },
  { id: 'taxes', label: 'Impostos e taxas' },
];

const MESSAGES = {
  loading: 'Buscando…',
  error: 'Não foi possível carregar a lista.',
  empty: 'Nada encontrado.',
};

async function renderSelect(overrides: Partial<SearchSelectProps> = {}) {
  const props: SearchSelectProps = {
    label: 'Categoria',
    placeholder: 'Digite o nome da categoria',
    text: '',
    status: 'results',
    options: OPTIONS,
    messages: MESSAGES,
    onChangeText: jest.fn(),
    onSelect: jest.fn(),
    ...overrides,
  };
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<SearchSelect {...props} />);
  });
  return { renderer: renderer!, props };
}

function input(renderer: Renderer): ReactTestInstance {
  return renderer.root.find(node => node.type === TextInput);
}

async function focus(renderer: Renderer): Promise<void> {
  await act(async () => {
    input(renderer).props.onFocus();
  });
}

function rows(renderer: Renderer): ReactTestInstance[] {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
}

function rowLabels(renderer: Renderer): string[] {
  return rows(renderer).map(row =>
    row
      .findAll(
        node =>
          typeof node.type === 'string' &&
          typeof node.props.children === 'string',
      )
      .map(node => node.props.children as string)
      .join(''),
  );
}

function hasText(renderer: Renderer, text: string): boolean {
  return renderer.root.findAll(node => node.props.children === text).length > 0;
}

test('is a labelled combobox that stays collapsed until it gets focus', async () => {
  const { renderer } = await renderSelect();

  expect(input(renderer).props.accessibilityRole).toBe('combobox');
  expect(input(renderer).props.accessibilityLabel).toBe('Categoria');
  expect(input(renderer).props.placeholder).toBe('Digite o nome da categoria');
  expect(input(renderer).props.accessibilityState).toEqual({
    expanded: false,
  });
  expect(rows(renderer)).toHaveLength(0);

  await focus(renderer);

  expect(input(renderer).props.accessibilityState).toEqual({ expanded: true });
  expect(rowLabels(renderer)).toEqual(['Insumos', 'Impostos e taxas']);
});

test('forwards what is typed without filtering on its own', async () => {
  const onChangeText = jest.fn();
  const { renderer } = await renderSelect({ text: 'ins', onChangeText });

  expect(input(renderer).props.value).toBe('ins');

  await act(async () => {
    input(renderer).props.onChangeText('insu');
  });

  expect(onChangeText).toHaveBeenCalledWith('insu');
  await focus(renderer);
  expect(rowLabels(renderer)).toEqual(['Insumos', 'Impostos e taxas']);
});

test('picking a row selects that option and closes the list', async () => {
  const onSelect = jest.fn();
  const { renderer } = await renderSelect({ onSelect });
  await focus(renderer);

  await act(async () => {
    rows(renderer)[1].props.onPress();
  });

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  expect(rows(renderer)).toHaveLength(0);
  expect(input(renderer).props.accessibilityState).toEqual({
    expanded: false,
  });
});

test('typing again after a pick opens the list while the input keeps focus', async () => {
  const { renderer } = await renderSelect();
  await focus(renderer);
  await act(async () => {
    rows(renderer)[0].props.onPress();
  });
  expect(rows(renderer)).toHaveLength(0);

  await act(async () => {
    input(renderer).props.onChangeText('Imp');
  });

  expect(rowLabels(renderer)).toEqual(['Insumos', 'Impostos e taxas']);
  expect(input(renderer).props.accessibilityState).toEqual({ expanded: true });
});

test('a pick lets go of the input, so tapping the field again reopens the list', async () => {
  const { renderer } = await renderSelect();
  await focus(renderer);
  const blur = jest.spyOn(input(renderer).instance, 'blur');
  blur.mockClear();

  await act(async () => {
    rows(renderer)[0].props.onPress();
  });

  expect(blur).toHaveBeenCalledTimes(1);
  await focus(renderer);
  expect(rowLabels(renderer)).toEqual(['Insumos', 'Impostos e taxas']);
});

test('marks only the chosen option as selected', async () => {
  const { renderer } = await renderSelect({ selectedId: 'taxes' });
  await focus(renderer);

  expect(rows(renderer).map(row => row.props.accessibilityState)).toEqual([
    { selected: false },
    { selected: true },
  ]);
});

test.each<[SearchSelectProps['status'], string]>([
  ['loading', MESSAGES.loading],
  ['error', MESSAGES.error],
  ['empty', MESSAGES.empty],
])(
  'shows the %s message under the input instead of a list',
  async (status, message) => {
    const { renderer } = await renderSelect({ status, options: [] });
    await focus(renderer);

    expect(hasText(renderer, message)).toBe(true);
    expect(rows(renderer)).toHaveLength(0);
    expect(input(renderer).props.accessibilityState).toEqual({
      expanded: false,
    });
  },
);

test('shows nothing under the input while idle, even when focused', async () => {
  const { renderer } = await renderSelect({ status: 'idle', options: [] });
  await focus(renderer);

  expect(rows(renderer)).toHaveLength(0);
  Object.values(MESSAGES).forEach(message =>
    expect(hasText(renderer, message)).toBe(false),
  );
});

function fieldBorder(renderer: Renderer): string {
  const field = renderer.root.find(
    node =>
      typeof node.type === 'string' &&
      typeof node.props.className === 'string' &&
      node.props.className.includes('rounded-xl border') &&
      node.findAll(child => child.type === TextInput).length > 0,
  );
  return field.props.className as string;
}

test('the error replaces the border colour, shows under the input and is read with it', async () => {
  const { renderer } = await renderSelect({
    error: 'Selecione uma categoria.',
  });

  expect(fieldBorder(renderer)).toContain('border-alert-primary');
  expect(hasText(renderer, 'Selecione uma categoria.')).toBe(true);
  expect(input(renderer).props.accessibilityHint).toBe(
    'Selecione uma categoria.',
  );
});

test('a trailing icon sits inside the field, hidden from screen readers', async () => {
  const { renderer: plain } = await renderSelect();
  expect(
    plain.root.findAll(node => node.props.as === ChevronDown),
  ).toHaveLength(0);

  const { renderer } = await renderSelect({ trailingIcon: ChevronDown });
  const [icon] = renderer.root.findAll(node => node.props.as === ChevronDown);
  expect(icon).toBeDefined();
  expect(fieldBorder(renderer)).toContain('border-border-primary');
  const wrapper = renderer.root.find(
    node =>
      node.props.importantForAccessibility === 'no-hide-descendants' &&
      node.findAll(child => child.props.as === ChevronDown).length > 0,
  );
  expect(wrapper.props.accessibilityElementsHidden).toBe(true);
});

test('the caller can change the spacing around the field', async () => {
  const { renderer } = await renderSelect({ className: 'mb-0' });

  expect(
    renderer.root.findAll(node => node.props.className === 'mb-0'),
  ).not.toHaveLength(0);
});

test('tapping the trailing icon focuses the field and opens the list', async () => {
  const { renderer } = await renderSelect({ trailingIcon: ChevronDown });
  const focusInput = jest.spyOn(input(renderer).instance, 'focus');
  focusInput.mockClear();

  await act(async () => {
    renderer.root
      .findByProps({ testID: 'search-select-trailing-icon' })
      .props.onPress();
  });

  expect(focusInput).toHaveBeenCalledTimes(1);
  expect(rowLabels(renderer)).toEqual(['Insumos', 'Impostos e taxas']);
});

describe('add option', () => {
  const addLabel = 'Adicionar Categoria';

  test('comes last, after the matching options', async () => {
    const { renderer } = await renderSelect({
      addOption: { label: addLabel, onPress: jest.fn() },
    });
    await focus(renderer);

    expect(rowLabels(renderer)).toEqual([
      'Insumos',
      'Impostos e taxas',
      addLabel,
    ]);
  });

  test('replaces the empty message when nothing matches', async () => {
    const { renderer } = await renderSelect({
      status: 'empty',
      options: [],
      addOption: { label: addLabel, onPress: jest.fn() },
    });
    await focus(renderer);

    expect(rowLabels(renderer)).toEqual([addLabel]);
    expect(hasText(renderer, MESSAGES.empty)).toBe(false);
    expect(input(renderer).props.accessibilityState).toEqual({
      expanded: true,
    });
  });

  test.each<SearchSelectProps['status']>(['loading', 'error'])(
    'is not offered while the status is %s',
    async status => {
      const { renderer } = await renderSelect({
        status,
        options: [],
        addOption: { label: addLabel, onPress: jest.fn() },
      });
      await focus(renderer);

      expect(rows(renderer)).toHaveLength(0);
    },
  );

  test('closes the list and calls onPress once', async () => {
    const onPress = jest.fn();
    const onSelect = jest.fn();
    const { renderer } = await renderSelect({
      onSelect,
      addOption: { label: addLabel, onPress },
    });
    await focus(renderer);

    await act(async () => {
      rows(renderer)[2].props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(rows(renderer)).toHaveLength(0);
  });
});

describe('closing on blur', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('waits 150 ms so a tap on a row still lands', async () => {
    const { renderer } = await renderSelect();
    await focus(renderer);

    await act(async () => {
      input(renderer).props.onBlur();
      jest.advanceTimersByTime(149);
    });
    expect(rows(renderer)).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(rows(renderer)).toHaveLength(0);
  });

  test('focusing again before the delay keeps the list open', async () => {
    const { renderer } = await renderSelect();
    await focus(renderer);

    await act(async () => {
      input(renderer).props.onBlur();
      jest.advanceTimersByTime(100);
    });
    await focus(renderer);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(rows(renderer)).toHaveLength(2);
  });

  test('a row tapped during the delay is selected', async () => {
    const onSelect = jest.fn();
    const { renderer } = await renderSelect({ onSelect });
    await focus(renderer);

    await act(async () => {
      input(renderer).props.onBlur();
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      rows(renderer)[0].props.onPress();
    });

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
  });
});

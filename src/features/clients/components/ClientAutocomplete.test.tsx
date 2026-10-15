import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { ClientAutocomplete } from './ClientAutocomplete';

type ClientAutocompleteProps = ComponentProps<typeof ClientAutocomplete>;

const CLIENTS = [
  { id: 'c-1', name: 'Clínica Bicho Feliz' },
  { id: 'c-2', name: 'Ana Souza' },
];

const MESSAGES = {
  loading: 'Buscando…',
  error: 'Não foi possível buscar. Tente novamente.',
  empty: 'Nenhuma clínica encontrada. Cadastre em Parceiros → Clínicas.',
};

async function renderField(overrides: Partial<ClientAutocompleteProps> = {}) {
  const props: ClientAutocompleteProps = {
    label: 'Tomador',
    placeholder: 'Busque pelo nome',
    value: '',
    status: 'results',
    options: CLIENTS,
    messages: MESSAGES,
    onChangeText: jest.fn(),
    onSelect: jest.fn(),
    ...overrides,
  };
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ClientAutocomplete {...props} />);
  });
  return renderer!;
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

function hasText(renderer: Renderer, text: string): boolean {
  return renderer.root.findAll(node => node.props.children === text).length > 0;
}

test('shows the typed value and forwards what is typed', async () => {
  const onChangeText = jest.fn();
  const renderer = await renderField({ value: 'Ana', onChangeText });

  expect(input(renderer).props.accessibilityLabel).toBe('Tomador');
  expect(input(renderer).props.placeholder).toBe('Busque pelo nome');
  expect(input(renderer).props.value).toBe('Ana');

  await act(async () => {
    input(renderer).props.onChangeText('Ana S');
  });

  expect(onChangeText).toHaveBeenCalledWith('Ana S');
});

test('lists the clients by name once focused and hands back the one picked', async () => {
  const onSelect = jest.fn();
  const renderer = await renderField({ onSelect });

  expect(rows(renderer)).toHaveLength(0);
  await focus(renderer);

  expect(rows(renderer)).toHaveLength(2);
  expect(hasText(renderer, 'Clínica Bicho Feliz')).toBe(true);
  expect(hasText(renderer, 'Ana Souza')).toBe(true);

  await act(async () => {
    rows(renderer)[1].props.onPress();
  });

  expect(onSelect).toHaveBeenCalledWith(CLIENTS[1]);
  expect(rows(renderer)).toHaveLength(0);
});

test.each<[ClientAutocompleteProps['status'], string]>([
  ['loading', MESSAGES.loading],
  ['error', MESSAGES.error],
  ['empty', MESSAGES.empty],
])('shows the %s message while focused', async (status, message) => {
  const renderer = await renderField({ status, options: [] });

  expect(hasText(renderer, message)).toBe(false);
  await focus(renderer);

  expect(hasText(renderer, message)).toBe(true);
  expect(rows(renderer)).toHaveLength(0);
});

test('shows the field error under the input', async () => {
  const renderer = await renderField({ error: 'Escolha uma clínica da lista' });

  expect(hasText(renderer, 'Escolha uma clínica da lista')).toBe(true);
});

test('hides the list 150 ms after the input loses focus', async () => {
  jest.useFakeTimers();
  try {
    const renderer = await renderField();
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
  } finally {
    jest.useRealTimers();
  }
});

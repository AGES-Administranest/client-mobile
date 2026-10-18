import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { EntryDetailSheet, type EntryDetailFields } from './EntryDetailSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const field = (label: string, value: string, locked = false) => ({
  label,
  value,
  locked,
  accessibilityLabel: locked
    ? `${label}: ${value}, controlado pela origem`
    : `${label}: ${value}`,
});

const MANUAL_FIELDS: EntryDetailFields = {
  nature: { ...field('Tipo', 'Saída'), icon: ArrowDown },
  description: field('Descrição', 'Combustível'),
  amount: field('Valor (R$)', '180,00'),
  date: field('Data', '09/08/2026'),
  category: field('Categoria', 'Deslocamento'),
  scope: field('Escopo', 'Profissional'),
};

const AUTOMATIC_FIELDS: EntryDetailFields = {
  nature: { ...field('Tipo', 'Entrada', true), icon: ArrowUp },
  description: field('Descrição', 'Orquiectomia'),
  amount: field('Valor (R$)', '620,00', true),
  date: field('Data', '17/08/2026', true),
  category: field('Categoria', 'Honorários'),
  scope: field('Escopo', 'Profissional'),
};

type Props = React.ComponentProps<typeof EntryDetailSheet>;

async function render(overrides: Partial<Props> = {}) {
  const props: Props = {
    visible: true,
    title: 'Combustível',
    subtitle: 'Saída · Lançamento manual',
    automaticBadge: null,
    fields: MANUAL_FIELDS,
    lockedHint: null,
    originAction: null,
    texts: { close: 'Fechar', edit: 'Editar', delete: 'Excluir' },
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <EntryDetailSheet {...props} />
      </SafeAreaProvider>,
    );
  });
  return { renderer: renderer!, props };
}

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

const button = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
  renderer.root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType('Text' as never).some(t => t.props.children === label),
  );

const labelled = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAll(
      node => node.props.accessible === true && node.props.accessibilityLabel,
    )
    .map(node => node.props.accessibilityLabel as string);

test('shows a manual entry read-only, in the order of the Figma', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toEqual([
    'Combustível',
    'Saída · Lançamento manual',
    'Tipo',
    'Saída',
    'Descrição',
    'Combustível',
    'Valor (R$)',
    '180,00',
    'Data',
    '09/08/2026',
    'Categoria',
    'Deslocamento',
    'Escopo',
    'Profissional',
    'Editar',
    'Excluir',
  ]);
  expect(
    renderer.root.findAll(
      node => typeof node.props.onChangeText === 'function',
    ),
  ).toHaveLength(0);
});

test('the title is the header, and each field reads as one line', async () => {
  const { renderer } = await render();

  const header = renderer.root.find(
    node =>
      node.props.accessibilityRole === 'header' &&
      node.props.children === 'Combustível',
  );
  expect(header).toBeDefined();
  expect(labelled(renderer)).toEqual(
    expect.arrayContaining(['Valor (R$): 180,00', 'Categoria: Deslocamento']),
  );
});

test('Editar and Excluir report the tap', async () => {
  const { renderer, props } = await render();

  await act(() => button(renderer, 'Editar').props.onPress());
  await act(() => button(renderer, 'Excluir').props.onPress());

  expect(props.onEdit).toHaveBeenCalledTimes(1);
  expect(props.onDelete).toHaveBeenCalledTimes(1);
});

test('an automatic entry carries the badge, the locks and the way to its origin', async () => {
  const onOpen = jest.fn();
  const { renderer } = await render({
    title: 'Orquiectomia',
    subtitle: 'Entrada · Gerado pelo procedimento',
    automaticBadge: 'Automático',
    fields: AUTOMATIC_FIELDS,
    lockedHint: 'Tipo, valor e data vêm do procedimento. Corrija pela origem.',
    originAction: {
      label: 'Abrir procedimento',
      unavailableHint: null,
      onPress: onOpen,
    },
  });

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining([
      'Automático',
      'Tipo, valor e data vêm do procedimento. Corrija pela origem.',
      'Abrir procedimento',
    ]),
  );
  expect(labelled(renderer)).toContain(
    'Valor (R$): 620,00, controlado pela origem',
  );
  await act(() => button(renderer, 'Abrir procedimento').props.onPress());
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('an origin without a screen in the app is shown disabled, with the reason', async () => {
  const { renderer } = await render({
    automaticBadge: 'Automático',
    fields: AUTOMATIC_FIELDS,
    originAction: {
      label: 'Abrir pedido de compra',
      unavailableHint: 'Essa origem ainda não tem tela no app.',
      onPress: jest.fn(),
    },
  });

  const open = button(renderer, 'Abrir pedido de compra');
  expect(open.props.disabled).toBe(true);
  expect(open.props.accessibilityHint).toBe(
    'Essa origem ainda não tem tela no app.',
  );
  expect(textsOf(renderer)).toContain('Essa origem ainda não tem tela no app.');
});

test('closes from the backdrop', async () => {
  const { renderer, props } = await render();

  await act(() =>
    renderer.root.findByProps({ accessibilityLabel: 'Fechar' }).props.onPress(),
  );

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

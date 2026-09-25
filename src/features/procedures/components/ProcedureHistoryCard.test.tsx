import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  ProcedureHistoryCard,
  type ProcedureHistoryCardProps,
} from './ProcedureHistoryCard';

const BASE: ProcedureHistoryCardProps = {
  patientName: 'Mel',
  speciesLabel: 'Felino',
  asaLabel: 'ASA I',
  procedureName: 'Orquiectomia',
  clientName: 'Clínica VetCenter',
  date: '17 ago',
  amount: 'R$ 350,00',
};

function render(props: Partial<ProcedureHistoryCardProps> = {}) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ProcedureHistoryCard {...BASE} {...props} />,
    );
  });

  return renderer;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
}

test('mostra paciente, espécie, ASA, procedimento, tomador, data e valor', () => {
  expect(texts(render())).toEqual([
    'Mel',
    'Felino',
    'ASA I',
    'Orquiectomia',
    'Clínica VetCenter',
    '17 ago',
    'R$ 350,00',
  ]);
});

test('o paciente vem antes do procedimento: é o destaque do card', () => {
  const rendered = texts(render());

  expect(rendered.indexOf('Mel')).toBeLessThan(
    rendered.indexOf('Orquiectomia'),
  );
});

test('sem espécie, o card não mostra o texto nem deixa buraco', () => {
  const rendered = texts(render({ speciesLabel: undefined }));

  expect(rendered).toEqual([
    'Mel',
    'ASA I',
    'Orquiectomia',
    'Clínica VetCenter',
    '17 ago',
    'R$ 350,00',
  ]);
});

test('sem ASA, o selo não é renderizado', () => {
  expect(texts(render({ asaLabel: undefined }))).not.toContain('ASA I');
});

test('registro antigo, sem espécie nem ASA, renderiza sem erro e sem selo', () => {
  const rendered = texts(
    render({ speciesLabel: undefined, asaLabel: undefined }),
  );

  expect(rendered).toEqual([
    'Mel',
    'Orquiectomia',
    'Clínica VetCenter',
    '17 ago',
    'R$ 350,00',
  ]);
});

test('só vira botão quando há onPress', () => {
  expect(
    render().root.findAll(node => node.props.accessibilityRole === 'button'),
  ).toHaveLength(0);

  const onPress = jest.fn();
  const pressable = render({ onPress }).root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  )[0];
  act(() => pressable.props.onPress());

  expect(onPress).toHaveBeenCalledTimes(1);
});

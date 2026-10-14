import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  ProcedureFormSheet,
  type ProcedureFormTexts,
} from 'features/procedures/components/ProcedureFormSheet';
import type { ProcedureFormValues } from 'features/procedures/domain/procedure.types';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const TEXTS: ProcedureFormTexts = {
  title: 'Novo atendimento',
  confirm: 'Confirmar',
  close: 'Fechar',
  labels: {
    patientName: 'Paciente',
    procedureName: 'Procedimento',
    clientId: 'Local',
    patientAgeYears: 'Idade',
    weightKg: 'Peso',
    startTime: 'Início',
    endTime: 'Fim',
    date: 'Data',
    notes: 'Observações',
    amount: 'Valor',
    species: 'Espécie',
    asaClassification: 'ASA',
  },
  placeholders: {},
  speciesOptions: [{ value: 'CANINE', label: 'Canino' }],
  asaOptions: ['I', 'II'],
  errors: {},
  clientSearchMessages: {
    loading: 'Buscando...',
    error: 'Não foi possível buscar.',
    empty: 'Nenhum tomador encontrado.',
  },
};

const EMPTY_VALUES: ProcedureFormValues = {
  patientName: '',
  procedureName: '',
  clientId: null,
  species: null,
  asaClassification: null,
  weightKg: '',
  patientAgeYears: '',
  amount: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
};

async function render(
  overrides: Partial<Parameters<typeof ProcedureFormSheet>[0]> = {},
) {
  const props = {
    visible: true,
    values: EMPTY_VALUES,
    submitting: false,
    submitFailed: false,
    submitErrorText: 'Não foi possível salvar.',
    texts: TEXTS,
    client: { term: '', status: 'idle' as const, options: [] },
    onChangeText: jest.fn(),
    onChangeClientTerm: jest.fn(),
    onSelectClient: jest.fn(),
    onChangeSpecies: jest.fn(),
    onChangeAsa: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ProcedureFormSheet {...props} />
      </SafeAreaProvider>,
    );
  });
  return { renderer: renderer!, props };
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props?.children === 'string',
    )
    .map(node => node.props.children as string);
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(
      node =>
        typeof node.props?.onPress === 'function' &&
        node.findAll(
          child =>
            typeof child.type === 'string' && child.props?.children === label,
        ).length > 0,
    )
    .at(-1)!;
}

test('abre com o título como cabeçalho e o Confirmar fixo embaixo', async () => {
  const { renderer } = await render();

  const header = renderer.root.find(
    node =>
      typeof node.type === 'string' &&
      node.props?.accessibilityRole === 'header',
  );
  expect(header.props.children).toBe(TEXTS.title);
  expect(texts(renderer).at(-1)).toBe(TEXTS.confirm);
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
});

test('o fundo fecha a folha', async () => {
  const { renderer, props } = await render();

  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: TEXTS.close })
      .props.onPress(),
  );

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('Confirmar envia o formulário', async () => {
  const { renderer, props } = await render();

  await act(async () =>
    pressableWithText(renderer, TEXTS.confirm).props.onPress(),
  );

  expect(props.onSubmit).toHaveBeenCalledTimes(1);
});

test('a falha de envio aparece logo acima do Confirmar', async () => {
  const { renderer } = await render({ submitFailed: true });

  expect(texts(renderer).slice(-2)).toEqual([
    'Não foi possível salvar.',
    TEXTS.confirm,
  ]);
});

test('escolher a ASA repassa a opção', async () => {
  const { renderer, props } = await render();

  await act(async () => pressableWithText(renderer, 'II').props.onPress());

  expect(props.onChangeAsa).toHaveBeenCalledWith('II');
});

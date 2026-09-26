import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AppointmentFormSheet,
  type AppointmentDraft,
  type AppointmentErrors,
} from 'features/appointments';

const LABELS = {
  title: 'Novo atendimento',
  cancel: 'Cancelar',
  patient: 'Paciente',
  patientPlaceholder: 'Nome do animal',
  procedure: 'Procedimento',
  procedurePlaceholder: 'Ex: Orquiectomia',
  clinic: 'Clínica',
  clinicPlaceholder: 'Selecione a clínica',
  age: 'Idade',
  agePlaceholder: '0',
  weight: 'Peso (kg)',
  weightPlaceholder: '0',
  startTime: 'Hora de início',
  endTime: 'Hora do fim',
  timePlaceholder: '00:00',
  date: 'Data',
  datePlaceholder: 'Selecione a data',
  amount: 'Valor do atendimento',
  amountPlaceholder: '0',
  species: 'Espécie',
  asa: 'Classificação ASA',
  notes: 'Observações',
  notesPlaceholder: 'Ex: trazer exames anteriores',
  confirm: 'Confirmar',
};

const SPECIES_LABELS = { canine: 'Canino', feline: 'Felino' } as const;

const ERROR_MESSAGES = {
  required: 'Campo obrigatório',
  invalidDate: 'Informe uma data válida',
  invalidTime: 'Informe um horário válido',
  endBeforeStart: 'A hora do fim deve ser depois da hora de início',
  mustBePositive: 'Informe um valor maior que zero',
};

const SERVICE_TAKERS = [
  { id: 'client-1', name: 'Clínica Vida Animal' },
  { id: 'client-2', name: 'Clínica São Francisco' },
];

const DRAFT: AppointmentDraft = {
  date: '21/09/2026',
  startTime: '08:30',
  endTime: '10:00',
  clientId: 'client-1',
  patientName: 'Mel',
  procedureName: 'Orquiectomia',
  amount: '620,00',
  species: 'canine',
  ageYears: '3',
  weightKg: '8,4',
  asaClass: 'II',
  notes: '',
};

type Overrides = {
  draft?: Partial<AppointmentDraft>;
  errors?: AppointmentErrors;
  onSubmit?: () => void;
  onCancel?: () => void;
  onSpeciesChange?: (species: 'canine' | 'feline') => void;
  onClientChange?: (clientId: string) => void;
};

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

// A animação da folha roda em timers; desmontar a para antes de o Jest
// derrubar o ambiente.
afterEach(async () => {
  await act(() => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

async function renderSheet(overrides: Overrides = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <AppointmentFormSheet
        visible
        onCancel={overrides.onCancel ?? jest.fn()}
        onSubmit={overrides.onSubmit ?? jest.fn()}
        draft={{ ...DRAFT, ...overrides.draft }}
        errors={overrides.errors ?? {}}
        serviceTakers={SERVICE_TAKERS}
        isSaving={false}
        onDateChange={jest.fn()}
        onStartTimeChange={jest.fn()}
        onEndTimeChange={jest.fn()}
        onClientChange={overrides.onClientChange ?? jest.fn()}
        onPatientNameChange={jest.fn()}
        onProcedureNameChange={jest.fn()}
        onAmountChange={jest.fn()}
        onSpeciesChange={overrides.onSpeciesChange ?? jest.fn()}
        onAgeYearsChange={jest.fn()}
        onWeightKgChange={jest.fn()}
        onAsaClassChange={jest.fn()}
        onNotesChange={jest.fn()}
        labels={LABELS}
        speciesLabels={SPECIES_LABELS}
        errorMessages={ERROR_MESSAGES}
        failureMessage={null}
      />,
    );
  });

  mounted.push(renderer!);
  return renderer!;
}

function findButton(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  // O Button do design system marca `role`; os Pressable daqui marcam
  // `accessibilityRole`.
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      (node.props.accessibilityRole === 'button' ||
        node.props.role === 'button') &&
      typeof node.props.onPress === 'function',
  );
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(node => node.props.children);
}

test('mostra a espécie e a classificação ASA escolhidas como selecionadas', async () => {
  const renderer = await renderSheet();

  expect(findButton(renderer, 'Canino').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(findButton(renderer, 'Felino').props.accessibilityState).toEqual({
    selected: false,
  });
  expect(findButton(renderer, 'II').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(findButton(renderer, 'I').props.accessibilityState).toEqual({
    selected: false,
  });
});

test('marca com asterisco apenas os campos obrigatórios', async () => {
  const renderer = await renderSheet();

  const required = texts(renderer)
    .filter(children => Array.isArray(children) && children[1] === ' *')
    .map(children => children[0]);

  expect(required).toEqual([
    LABELS.patient,
    LABELS.procedure,
    LABELS.clinic,
    LABELS.startTime,
    LABELS.endTime,
    LABELS.date,
    LABELS.amount,
    LABELS.species,
  ]);
});

test('avisa a troca de espécie', async () => {
  const onSpeciesChange = jest.fn();
  const renderer = await renderSheet({ onSpeciesChange });

  await act(() => {
    findButton(renderer, 'Felino').props.onPress();
  });

  expect(onSpeciesChange).toHaveBeenCalledWith('feline');
});

test('escolhe o local na lista de tomadores', async () => {
  const onClientChange = jest.fn();
  const renderer = await renderSheet({
    draft: { clientId: null },
    onClientChange,
  });

  expect(texts(renderer)).toContain(LABELS.clinicPlaceholder);

  await act(() => {
    findButton(renderer, LABELS.clinic).props.onPress();
  });
  await act(() => {
    findButton(renderer, 'Clínica São Francisco').props.onPress();
  });

  expect(onClientChange).toHaveBeenCalledWith('client-2');
});

test('mostra a mensagem do erro no campo que falhou', async () => {
  const renderer = await renderSheet({
    draft: { endTime: '07:00' },
    errors: { endTime: 'endBeforeStart' },
  });

  expect(texts(renderer)).toContain(ERROR_MESSAGES.endBeforeStart);
});

test('confirma pelo botão e cancela pelo link do cabeçalho', async () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const renderer = await renderSheet({ onSubmit, onCancel });

  await act(() => {
    findButton(renderer, LABELS.confirm).props.onPress();
  });
  await act(() => {
    findButton(renderer, LABELS.cancel).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

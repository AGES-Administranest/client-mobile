import {
  appointmentToDraft,
  createDraft,
  EMPTY_APPOINTMENT_DRAFT,
  formatAmountInput,
  formatDateInput,
  formatTimeInput,
  formatWeightInput,
  isAppointmentValid,
  isDraftDirty,
  parseTimeToMinutes,
  toAppointmentPayload,
  toIsoDate,
  validateAppointmentDraft,
  type Appointment,
  type AppointmentDraft,
} from './appointment';

const VALID_DRAFT: AppointmentDraft = {
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

const STARTS_AT = new Date(2026, 8, 21, 8, 30).toISOString();
const ENDS_AT = new Date(2026, 8, 21, 10, 0).toISOString();

const EXISTING: Appointment = {
  id: 'appointment-1',
  clientId: 'client-1',
  patientName: 'Mel',
  procedureName: 'Orquiectomia',
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  amount: '620.00',
  species: 'CANINE',
  patientAgeYears: 3,
  weightKg: '8.400',
  asaClass: 'II',
  notes: null,
};

describe('máscaras de entrada', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['08', '08'],
    ['083', '08:3'],
    ['0830', '08:30'],
    ['08:300', '08:30'],
    ['ab08c30', '08:30'],
  ])('formatTimeInput(%p) === %p', (input, expected) => {
    expect(formatTimeInput(input)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['21', '21'],
    ['2109', '21/09'],
    ['21092026', '21/09/2026'],
    ['210920261', '21/09/2026'],
  ])('formatDateInput(%p) === %p', (input, expected) => {
    expect(formatDateInput(input)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['0', '0,00'],
    ['5', '0,05'],
    ['620', '6,20'],
    ['62000', '620,00'],
    ['123456789', '1.234.567,89'],
  ])('formatAmountInput(%p) === %p', (input, expected) => {
    expect(formatAmountInput(input)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['8', '8'],
    ['8,', '8,'],
    ['8.4', '8,4'],
    ['8,456789', '8,456'],
    ['12345', '123'],
  ])('formatWeightInput(%p) === %p', (input, expected) => {
    expect(formatWeightInput(input)).toBe(expected);
  });
});

describe('parseTimeToMinutes', () => {
  it.each([
    ['08:30', 510],
    ['00:00', 0],
    ['23:59', 1439],
  ])('converte %p em %p minutos', (input, expected) => {
    expect(parseTimeToMinutes(input)).toBe(expected);
  });

  it.each(['', '8', '08:6', '24:00', '08:60'])('rejeita %p', input => {
    expect(parseTimeToMinutes(input)).toBeNaN();
  });
});

describe('toIsoDate', () => {
  it('converte o campo mascarado para o formato da API', () => {
    expect(toIsoDate('21/09/2026')).toBe('2026-09-21');
  });

  it.each(['', '21/09', '31/02/2026', '00/01/2026'])(
    'devolve null para %p',
    input => {
      expect(toIsoDate(input)).toBeNull();
    },
  );
});

describe('rascunho inicial', () => {
  it('na criação, vem vazio com a data do dia escolhido no calendário', () => {
    expect(createDraft('2026-09-21')).toEqual({
      ...EMPTY_APPOINTMENT_DRAFT,
      date: '21/09/2026',
    });
  });

  it('na criação sem dia escolhido, a data também fica vazia', () => {
    expect(createDraft(null)).toEqual(EMPTY_APPOINTMENT_DRAFT);
  });

  it('na edição, vem preenchido com o agendamento existente', () => {
    expect(appointmentToDraft(EXISTING)).toEqual(VALID_DRAFT);
  });

  it.each([
    ['OTHER', { species: 'OTHER' as const }],
    ['sem espécie', { species: null }],
  ])(
    'deixa a espécie sem seleção quando o agendamento tem %s',
    (_case, patch) => {
      expect(appointmentToDraft({ ...EXISTING, ...patch }).species).toBeNull();
    },
  );

  it('deixa em branco o que o agendamento não tem', () => {
    const draft = appointmentToDraft({
      ...EXISTING,
      endsAt: null,
      amount: null,
      patientAgeYears: null,
      weightKg: null,
      notes: null,
    });

    expect(draft).toMatchObject({
      endTime: '',
      amount: '',
      ageYears: '',
      weightKg: '',
      notes: '',
    });
  });
});

describe('isDraftDirty', () => {
  it('não acusa alteração no rascunho recém-aberto', () => {
    const initial = createDraft('2026-09-21');

    expect(isDraftDirty(initial, initial)).toBe(false);
  });

  it('acusa qualquer campo alterado', () => {
    const initial = createDraft('2026-09-21');

    expect(isDraftDirty({ ...initial, notes: 'x' }, initial)).toBe(true);
    expect(isDraftDirty({ ...initial, asaClass: 'I' }, initial)).toBe(true);
  });
});

describe('validateAppointmentDraft', () => {
  it('não acusa nada num rascunho completo', () => {
    expect(validateAppointmentDraft(VALID_DRAFT)).toEqual({});
    expect(isAppointmentValid(validateAppointmentDraft(VALID_DRAFT))).toBe(
      true,
    );
  });

  it('cobra todos os campos obrigatórios quando o rascunho está vazio', () => {
    expect(validateAppointmentDraft(EMPTY_APPOINTMENT_DRAFT)).toEqual({
      date: 'required',
      startTime: 'required',
      endTime: 'required',
      clientId: 'required',
      patientName: 'required',
      procedureName: 'required',
      amount: 'required',
    });
  });

  it('cobra a espécie quando nenhuma está escolhida', () => {
    expect(validateAppointmentDraft({ ...VALID_DRAFT, species: null })).toEqual(
      { species: 'required' },
    );
  });

  it('não cobra idade, peso, classificação ASA nem observações', () => {
    const errors = validateAppointmentDraft({
      ...VALID_DRAFT,
      ageYears: '',
      weightKg: '',
      asaClass: null,
      notes: '',
    });

    expect(errors).toEqual({});
  });

  it('aceita atendimento de valor zero, mas não o campo em branco', () => {
    expect(
      validateAppointmentDraft({ ...VALID_DRAFT, amount: '0,00' }),
    ).toEqual({});
    expect(validateAppointmentDraft({ ...VALID_DRAFT, amount: '' })).toEqual({
      amount: 'required',
    });
  });

  it.each([
    ['data incompleta', { date: '21/09' }, { date: 'invalidDate' }],
    ['data inexistente', { date: '31/02/2026' }, { date: 'invalidDate' }],
    ['hora impossível', { startTime: '25:00' }, { startTime: 'invalidTime' }],
    [
      'fim antes do início',
      { endTime: '07:00' },
      { endTime: 'endBeforeStart' },
    ],
    [
      'fim igual ao início',
      { endTime: '08:30' },
      { endTime: 'endBeforeStart' },
    ],
    ['peso zerado', { weightKg: '0' }, { weightKg: 'mustBePositive' }],
  ])('acusa %s', (_case, patch, expected) => {
    expect(validateAppointmentDraft({ ...VALID_DRAFT, ...patch })).toEqual(
      expected,
    );
  });
});

describe('toAppointmentPayload', () => {
  it('monta o payload com data e hora combinadas num instante', () => {
    expect(toAppointmentPayload(VALID_DRAFT)).toEqual({
      clientId: 'client-1',
      patientName: 'Mel',
      procedureName: 'Orquiectomia',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      amount: 620,
      species: 'CANINE',
      patientAgeYears: 3,
      weightKg: 8.4,
      asaClass: 'II',
      notes: null,
    });
  });

  it('manda null no que ficou em branco em vez de zero ou texto vazio', () => {
    const payload = toAppointmentPayload({
      ...VALID_DRAFT,
      ageYears: '',
      weightKg: '',
      asaClass: null,
      notes: '   ',
    });

    expect(payload).toMatchObject({
      patientAgeYears: null,
      weightKg: null,
      asaClass: null,
      notes: null,
    });
  });

  it('manda zero quando o valor informado é zero', () => {
    expect(
      toAppointmentPayload({ ...VALID_DRAFT, amount: '0,00' })?.amount,
    ).toBe(0);
  });

  it('devolve null quando o rascunho não passa na validação', () => {
    expect(
      toAppointmentPayload({ ...VALID_DRAFT, patientName: '  ' }),
    ).toBeNull();
  });
});

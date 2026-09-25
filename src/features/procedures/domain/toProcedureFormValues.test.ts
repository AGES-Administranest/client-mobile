import { buildAppointment } from './appointment.fixture';
import { toUpdateAppointmentPayload } from './toCreateAppointmentPayload';
import { toProcedureFormValues } from './toProcedureFormValues';
import { validateProcedureForm } from './validateProcedureForm';
import { validProcedureForm } from './validProcedureForm.fixture';

describe('toProcedureFormValues', () => {
  it('devolve os campos do formulário como a pessoa os digitaria', () => {
    expect(toProcedureFormValues(buildAppointment())).toEqual({
      ...validProcedureForm,
      notes: '',
    });
  });

  it('gera um formulário que passa na validação', () => {
    expect(
      validateProcedureForm(toProcedureFormValues(buildAppointment())),
    ).toEqual({});
  });

  it('é o inverso do payload: ida e volta preserva o atendimento', () => {
    const values = toProcedureFormValues(buildAppointment({ notes: 'Jejum' }));

    expect(toUpdateAppointmentPayload(values)).toEqual({
      startsAt: buildAppointment().startsAt,
      endsAt: buildAppointment().endsAt,
      patientName: 'Rex',
      procedureName: 'Orquiectomia',
      clientId: 'client-1',
      species: 'CANINE',
      asa: 'I',
      weightKg: 12.5,
      patientAgeYears: 3,
      amount: 350,
      notes: 'Jejum',
    });
  });

  it.each([
    ['12.500', '12,5'],
    ['12.000', '12'],
    ['0.350', '0,35'],
    ['350.00', '350'],
    ['1234.50', '1234,5'],
  ])('decimal do backend %j vira %j no campo', (backend, field) => {
    expect(
      toProcedureFormValues(buildAppointment({ weightKg: backend })).weightKg,
    ).toBe(field);
    expect(
      toProcedureFormValues(buildAppointment({ amount: backend })).amount,
    ).toBe(field);
  });

  it('deixa vazios os campos opcionais que vieram null', () => {
    const values = toProcedureFormValues(
      buildAppointment({
        patientName: null,
        procedureName: null,
        endsAt: null,
        weightKg: null,
        patientAgeYears: null,
        amount: null,
        asa: null,
        species: null,
        notes: null,
      }),
    );

    expect(values).toMatchObject({
      patientName: '',
      procedureName: '',
      endTime: '',
      weightKg: '',
      patientAgeYears: '',
      amount: '',
      asaClassification: null,
      species: null,
      notes: '',
    });
  });

  it('mantém a idade zero (filhote) em vez de tratá-la como vazia', () => {
    expect(
      toProcedureFormValues(buildAppointment({ patientAgeYears: 0 }))
        .patientAgeYears,
    ).toBe('0');
  });

  it.each([
    ['I', 'I'],
    ['IV', 'IV'],
    ['ASA II', null],
    ['V', null],
    ['', null],
  ])('asa %j vira seleção %j', (asa, selection) => {
    expect(
      toProcedureFormValues(buildAppointment({ asa })).asaClassification,
    ).toBe(selection);
  });

  it.each([
    [new Date(2026, 0, 5, 0, 5), '05/01/2026', '00:05'],
    [new Date(2026, 11, 31, 23, 59), '31/12/2026', '23:59'],
    [new Date(2026, 7, 6, 9, 0), '06/08/2026', '09:00'],
  ])('data e hora locais de %s', (startsAt, date, startTime) => {
    expect(
      toProcedureFormValues(
        buildAppointment({ startsAt: startsAt.toISOString() }),
      ),
    ).toMatchObject({ date, startTime });
  });

  it('mantém o clientId do atendimento, nulo nos registros antigos', () => {
    expect(
      toProcedureFormValues(buildAppointment({ clientId: null })).clientId,
    ).toBeNull();
    expect(toProcedureFormValues(buildAppointment()).clientId).toBe('client-1');
  });
});

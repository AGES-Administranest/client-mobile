import { toCreateAppointmentPayload } from './toCreateAppointmentPayload';
import { validateProcedureForm } from './validateProcedureForm';
import type { ProcedureFormValues } from './procedure.types';

const valid: ProcedureFormValues = {
  patientName: 'Rex',
  procedureName: 'Orquiectomia',
  location: 'Clínica VetCenter',
  species: 'CANINE',
  asaClassification: 'I',
  weightKg: '12,5',
  patientAgeYears: '3',
  amount: '350',
  startsAt: new Date('2026-08-06T09:00:00.000Z'),
  endsAt: new Date('2026-08-06T10:00:00.000Z'),
  notes: '',
};

describe('validateProcedureForm', () => {
  it('não retorna erros para um formulário válido', () => {
    expect(validateProcedureForm(valid)).toEqual({});
  });

  it('exige paciente, procedimento e data quando vazios', () => {
    const errors = validateProcedureForm({
      ...valid,
      patientName: '   ',
      procedureName: '',
      startsAt: null,
    });
    expect(errors.patientName).toBe('REQUIRED');
    expect(errors.procedureName).toBe('REQUIRED');
    expect(errors.startsAt).toBe('REQUIRED');
  });

  it('aceita campos opcionais vazios', () => {
    expect(
      validateProcedureForm({
        ...valid,
        weightKg: '',
        patientAgeYears: '',
        amount: '',
        endsAt: null,
      }),
    ).toEqual({});
  });

  it('peso não numérico é inválido', () => {
    expect(validateProcedureForm({ ...valid, weightKg: 'abc' }).weightKg).toBe(
      'INVALID_NUMBER',
    );
  });

  it('peso negativo é inválido', () => {
    expect(validateProcedureForm({ ...valid, weightKg: '-1' }).weightKg).toBe(
      'MUST_BE_NON_NEGATIVE',
    );
  });

  it('idade decimal não é permitida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '2,5' })
        .patientAgeYears,
    ).toBe('MUST_BE_INTEGER');
  });

  it('idade 0 é válida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '0' })
        .patientAgeYears,
    ).toBeUndefined();
  });

  it('idade acima de 100 é inválida', () => {
    expect(
      validateProcedureForm({ ...valid, patientAgeYears: '101' })
        .patientAgeYears,
    ).toBe('AGE_OUT_OF_RANGE');
  });

  it('valor negativo é inválido', () => {
    expect(validateProcedureForm({ ...valid, amount: '-5' }).amount).toBe(
      'MUST_BE_NON_NEGATIVE',
    );
  });

  it('fim igual ou anterior ao início é inválido', () => {
    expect(
      validateProcedureForm({
        ...valid,
        startsAt: new Date('2026-08-06T10:00:00.000Z'),
        endsAt: new Date('2026-08-06T09:00:00.000Z'),
      }).endsAt,
    ).toBe('END_BEFORE_START');
  });
});

describe('toCreateAppointmentPayload', () => {
  it('converte startsAt para ISO e nunca envia status nem userId', () => {
    const payload = toCreateAppointmentPayload(valid);
    expect(payload.startsAt).toBe('2026-08-06T09:00:00.000Z');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('userId');
  });

  it('parseia vírgula decimal em number', () => {
    const payload = toCreateAppointmentPayload(valid);
    expect(payload.weightKg).toBe(12.5);
    expect(payload.amount).toBe(350);
    expect(payload.patientAgeYears).toBe(3);
  });

  it('envia asa com o valor puro', () => {
    expect(toCreateAppointmentPayload(valid).asa).toBe('I');
  });

  it('omite asa quando não selecionada', () => {
    const payload = toCreateAppointmentPayload({
      ...valid,
      asaClassification: null,
    });
    expect(payload).not.toHaveProperty('asa');
  });

  it('omite campos opcionais vazios', () => {
    const payload = toCreateAppointmentPayload({
      ...valid,
      location: '',
      amount: '',
      weightKg: '',
      patientAgeYears: '',
      notes: '',
      endsAt: null,
    });
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('amount');
    expect(payload).not.toHaveProperty('weightKg');
    expect(payload).not.toHaveProperty('patientAgeYears');
    expect(payload).not.toHaveProperty('notes');
    expect(payload).not.toHaveProperty('endsAt');
  });
});

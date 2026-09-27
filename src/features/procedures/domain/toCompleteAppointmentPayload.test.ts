import { toCompleteAppointmentPayload } from './toCompleteAppointmentPayload';
import { validProcedureForm as valid } from './validProcedureForm.fixture';

describe('toCompleteAppointmentPayload', () => {
  it('envia os dados do procedimento, com números já convertidos', () => {
    expect(
      toCompleteAppointmentPayload({ ...valid, notes: 'Sem intercorrências' }),
    ).toEqual({
      patientName: 'Rex',
      procedureName: 'Orquiectomia',
      species: 'CANINE',
      asa: 'I',
      weightKg: 12.5,
      patientAgeYears: 3,
      amount: 350,
      notes: 'Sem intercorrências',
    });
  });

  // O backend responde 400 para qualquer um destes no corpo: cliente e
  // horários são os do agendamento, e o id vai na URL.
  it.each(['clientId', 'startsAt', 'endsAt', 'status', 'location', 'userId'])(
    'nunca envia %s, mesmo com o formulário preenchido',
    field => {
      expect(toCompleteAppointmentPayload(valid)).not.toHaveProperty(field);
    },
  );

  it.each([
    ['amount', '250,50', 250.5],
    ['amount', '0,99', 0.99],
    ['weightKg', '12.5', 12.5],
    ['patientAgeYears', ' 7 ', 7],
  ] as const)('converte %s "%s" em %d', (field, raw, expected) => {
    expect(
      toCompleteAppointmentPayload({ ...valid, [field]: raw })[field],
    ).toBe(expected);
  });

  it.each(['amount', 'weightKg', 'patientAgeYears'] as const)(
    'omite %s vazio ou inválido',
    field => {
      expect(
        toCompleteAppointmentPayload({ ...valid, [field]: '' }),
      ).not.toHaveProperty(field);
      expect(
        toCompleteAppointmentPayload({ ...valid, [field]: 'abc' }),
      ).not.toHaveProperty(field);
    },
  );

  it.each(['patientName', 'procedureName', 'notes'] as const)(
    'omite %s em branco e apara os espaços quando preenchido',
    field => {
      expect(
        toCompleteAppointmentPayload({ ...valid, [field]: '   ' }),
      ).not.toHaveProperty(field);
      expect(
        toCompleteAppointmentPayload({ ...valid, [field]: '  Texto  ' })[field],
      ).toBe('Texto');
    },
  );

  it('omite espécie e ASA não selecionadas', () => {
    const payload = toCompleteAppointmentPayload({
      ...valid,
      species: null,
      asaClassification: null,
    });

    expect(payload).not.toHaveProperty('species');
    expect(payload).not.toHaveProperty('asa');
  });
});

import { toCreateAppointmentPayload } from './toCreateAppointmentPayload';
import { validProcedureForm as valid } from './validProcedureForm.fixture';

describe('toCreateAppointmentPayload', () => {
  it('converte data e hora local para ISO e nunca envia status nem userId', () => {
    const payload = toCreateAppointmentPayload(valid);
    expect(payload.startsAt).toBe(
      new Date(2026, 7, 6, 9, 0, 0, 0).toISOString(),
    );
    expect(payload.endsAt).toBe(
      new Date(2026, 7, 6, 10, 0, 0, 0).toISOString(),
    );
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
      endTime: '',
    });
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('amount');
    expect(payload).not.toHaveProperty('weightKg');
    expect(payload).not.toHaveProperty('patientAgeYears');
    expect(payload).not.toHaveProperty('notes');
    expect(payload).not.toHaveProperty('endsAt');
  });

  it('remove espaços das pontas dos textos', () => {
    const payload = toCreateAppointmentPayload({
      ...valid,
      patientName: '  Rex ',
      procedureName: ' Orquiectomia  ',
      location: ' Clínica ',
      notes: '  obs  ',
    });
    expect(payload.patientName).toBe('Rex');
    expect(payload.procedureName).toBe('Orquiectomia');
    expect(payload.location).toBe('Clínica');
    expect(payload.notes).toBe('obs');
  });

  it('envia a espécie selecionada e omite quando não há seleção', () => {
    expect(toCreateAppointmentPayload(valid).species).toBe('CANINE');
    expect(
      toCreateAppointmentPayload({ ...valid, species: null }),
    ).not.toHaveProperty('species');
  });
});

import {
  ASA_CLASSIFICATIONS,
  type AppointmentResult,
  type AsaClassification,
  type ProcedureFormValues,
} from './procedure.types';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function toMaskedDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

function toMaskedTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// O backend devolve decimais como string com zeros de escala ("12.500"); o
// campo mostra o que a pessoa digitaria ("12,5").
function toDecimalField(value: string | null): string {
  if (value === null) {
    return '';
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}`.replace('.', ',') : '';
}

// O backend guarda `asa` como texto livre (até 20 caracteres); só os quatro
// valores que o formulário oferece podem voltar como seleção.
function toAsaClassification(asa: string | null): AsaClassification | null {
  return ASA_CLASSIFICATIONS.find(option => option === asa) ?? null;
}

// O formulário tem uma só data: o fim reaproveita o dia do início.
export function toProcedureFormValues(
  appointment: AppointmentResult,
): ProcedureFormValues {
  const startsAt = new Date(appointment.startsAt);

  return {
    patientName: appointment.patientName ?? '',
    procedureName: appointment.procedureName ?? '',
    clientId: appointment.clientId,
    species: appointment.species,
    asaClassification: toAsaClassification(appointment.asa),
    weightKg: toDecimalField(appointment.weightKg),
    patientAgeYears:
      appointment.patientAgeYears === null
        ? ''
        : `${appointment.patientAgeYears}`,
    amount: toDecimalField(appointment.amount),
    date: toMaskedDate(startsAt),
    startTime: toMaskedTime(startsAt),
    endTime:
      appointment.endsAt === null
        ? ''
        : toMaskedTime(new Date(appointment.endsAt)),
    notes: appointment.notes ?? '',
  };
}

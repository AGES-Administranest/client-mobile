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

function toDecimalField(value: string | null): string {
  if (value === null) {
    return '';
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}`.replace('.', ',') : '';
}

function toAsaClassification(asa: string | null): AsaClassification | null {
  return ASA_CLASSIFICATIONS.find(option => option === asa) ?? null;
}

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

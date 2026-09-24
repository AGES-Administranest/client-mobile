import { parseDecimal } from './parseDecimal';
import { combineDateAndTime } from './parseProcedureDateTime';
import type {
  CreateAppointmentPayload,
  ProcedureFormValues,
} from './procedure.types';

export function toCreateAppointmentPayload(
  values: ProcedureFormValues,
): CreateAppointmentPayload {
  const startsAt = combineDateAndTime(values.date, values.startTime);
  const payload: CreateAppointmentPayload = {
    startsAt: startsAt!.toISOString(),
  };

  if (values.endTime.trim() !== '') {
    const endsAt = combineDateAndTime(values.date, values.endTime);
    if (endsAt !== null) {
      payload.endsAt = endsAt.toISOString();
    }
  }
  if (values.patientName.trim() !== '') {
    payload.patientName = values.patientName.trim();
  }
  if (values.procedureName.trim() !== '') {
    payload.procedureName = values.procedureName.trim();
  }
  if (values.location.trim() !== '') {
    payload.location = values.location.trim();
  }
  if (values.species !== null) {
    payload.species = values.species;
  }
  if (values.asaClassification !== null) {
    payload.asa = values.asaClassification;
  }
  if (values.weightKg.trim() !== '') {
    const weight = parseDecimal(values.weightKg);
    if (weight !== null) {
      payload.weightKg = weight;
    }
  }
  if (values.patientAgeYears.trim() !== '') {
    const age = parseDecimal(values.patientAgeYears);
    if (age !== null) {
      payload.patientAgeYears = age;
    }
  }
  if (values.amount.trim() !== '') {
    const amount = parseDecimal(values.amount);
    if (amount !== null) {
      payload.amount = amount;
    }
  }
  if (values.notes.trim() !== '') {
    payload.notes = values.notes.trim();
  }

  return payload;
}

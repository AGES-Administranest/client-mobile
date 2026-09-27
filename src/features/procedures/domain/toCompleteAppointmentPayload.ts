import { parseDecimal } from './parseDecimal';
import type {
  AsaClassification,
  ProcedureFormValues,
  Species,
} from './procedure.types';

// Só o que o PATCH /appointments/:id/complete aceita. Cliente, local e
// horários são o que foi agendado e não mudam na conversão; o backend
// valida com forbidNonWhitelisted e responde 400 se eles vierem no corpo.
// O id do agendamento vai na URL.
export interface CompleteAppointmentPayload {
  amount?: number;
  procedureName?: string;
  patientName?: string;
  species?: Species;
  asa?: AsaClassification;
  weightKg?: number;
  patientAgeYears?: number;
  notes?: string;
}

export function toCompleteAppointmentPayload(
  values: ProcedureFormValues,
): CompleteAppointmentPayload {
  const payload: CompleteAppointmentPayload = {};

  if (values.patientName.trim() !== '') {
    payload.patientName = values.patientName.trim();
  }
  if (values.procedureName.trim() !== '') {
    payload.procedureName = values.procedureName.trim();
  }
  if (values.species !== null) {
    payload.species = values.species;
  }
  if (values.asaClassification !== null) {
    payload.asa = values.asaClassification;
  }
  const weight = parseDecimal(values.weightKg);
  if (weight !== null) {
    payload.weightKg = weight;
  }
  const age = parseDecimal(values.patientAgeYears);
  if (age !== null) {
    payload.patientAgeYears = age;
  }
  const amount = parseDecimal(values.amount);
  if (amount !== null) {
    payload.amount = amount;
  }
  if (values.notes.trim() !== '') {
    payload.notes = values.notes.trim();
  }

  return payload;
}

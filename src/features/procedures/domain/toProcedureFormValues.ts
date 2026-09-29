import { EMPTY_PROCEDURE_FORM, type ProcedureFormValues } from './procedure.types';

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const decimal = (v: string | number | null) =>
  v === null ? '' : String(v).replace('.', ',');

type AppointmentSnapshot = {
  patientName: string | null;
  procedureName: string | null;
  clientId: string | null;
  species: ProcedureFormValues['species'];
  asa: string | null;
  weightKg: string | null;
  patientAgeYears: number | null;
  amount: string | null;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
};

export function toProcedureFormValues(
  a: AppointmentSnapshot,
): ProcedureFormValues {
  const start = new Date(a.startsAt);
  return {
    ...EMPTY_PROCEDURE_FORM,
    patientName: a.patientName ?? '',
    procedureName: a.procedureName ?? '',
    clientId: a.clientId,
    species: a.species,
    asaClassification: (a.asa as ProcedureFormValues['asaClassification']) ?? null,
    weightKg: decimal(a.weightKg),
    patientAgeYears: decimal(a.patientAgeYears),
    amount: decimal(a.amount),
    date: toDate(start),
    startTime: toTime(start),
    endTime: a.endsAt ? toTime(new Date(a.endsAt)) : '',
    notes: a.notes ?? '',
  };
}

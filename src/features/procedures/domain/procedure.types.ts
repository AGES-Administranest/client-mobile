export type Species = 'CANINE' | 'FELINE' | 'OTHER';

export const ASA_CLASSIFICATIONS = ['I', 'II', 'III', 'IV'] as const;

export type AsaClassification = (typeof ASA_CLASSIFICATIONS)[number];

export type ProcedureTextField =
  | 'patientName'
  | 'procedureName'
  | 'location'
  | 'weightKg'
  | 'patientAgeYears'
  | 'amount'
  | 'notes'
  | 'date'
  | 'startTime'
  | 'endTime';

export interface ProcedureFormValues {
  patientName: string;
  procedureName: string;
  location: string;
  species: Species | null;
  asaClassification: AsaClassification | null;
  weightKg: string;
  patientAgeYears: string;
  amount: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export type FieldErrorCode =
  | 'REQUIRED'
  | 'INVALID_NUMBER'
  | 'MUST_BE_POSITIVE'
  | 'MUST_BE_NON_NEGATIVE'
  | 'MUST_BE_INTEGER'
  | 'AGE_OUT_OF_RANGE'
  | 'END_BEFORE_START'
  | 'INVALID_DATE'
  | 'INVALID_TIME';

export type ProcedureErrors = Partial<
  Record<keyof ProcedureFormValues, FieldErrorCode>
>;

export interface CreateAppointmentPayload {
  startsAt: string;
  endsAt?: string;
  patientName?: string;
  procedureName?: string;
  location?: string;
  species?: Species;
  asa?: AsaClassification;
  weightKg?: number;
  patientAgeYears?: number;
  amount?: number;
  notes?: string;
}

export const EMPTY_PROCEDURE_FORM: ProcedureFormValues = {
  patientName: '',
  procedureName: '',
  location: '',
  species: null,
  asaClassification: null,
  weightKg: '',
  patientAgeYears: '',
  amount: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
};

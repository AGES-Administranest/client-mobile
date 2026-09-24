export type Species = 'CANINE' | 'FELINE' | 'OTHER';

export type AsaClassification = 'I' | 'II' | 'III' | 'IV';

export type ProcedureTextField =
  | 'patientName'
  | 'procedureName'
  | 'location'
  | 'weightKg'
  | 'patientAgeYears'
  | 'amount'
  | 'notes';

export interface ProcedureFormValues {
  patientName: string;
  procedureName: string;
  location: string;
  species: Species | null;
  asaClassification: AsaClassification | null;
  weightKg: string;
  patientAgeYears: string;
  amount: string;
  startsAt: Date | null;
  endsAt: Date | null;
  notes: string;
}

export type FieldErrorCode =
  | 'REQUIRED'
  | 'INVALID_NUMBER'
  | 'MUST_BE_POSITIVE'
  | 'MUST_BE_NON_NEGATIVE'
  | 'MUST_BE_INTEGER'
  | 'AGE_OUT_OF_RANGE'
  | 'END_BEFORE_START';

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
  startsAt: null,
  endsAt: null,
  notes: '',
};

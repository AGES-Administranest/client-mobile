export type Species =
  | 'CANINE'
  | 'FELINE'
  | 'EQUINE'
  | 'BOVINE'
  | 'AVIAN'
  | 'EXOTIC'
  | 'OTHER';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

export const ASA_CLASSIFICATIONS = ['I', 'II', 'III', 'IV', 'V'] as const;

export type AsaClassification = (typeof ASA_CLASSIFICATIONS)[number];

export type ProcedureTextField =
  | 'patientName'
  | 'procedureName'
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
  clientId: string | null;
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
  | 'MUST_BE_INTEGER'
  | 'TOO_SHORT'
  | 'MAX_2_DECIMALS'
  | 'MAX_3_DECIMALS'
  | 'AGE_OUT_OF_RANGE'
  | 'END_BEFORE_START'
  | 'IN_THE_PAST'
  | 'REQUIRED_FOR_SCHEDULE'
  | 'SELECT_CLIENT'
  | 'INVALID_DATE'
  | 'INVALID_TIME';

export type ProcedureErrors = Partial<
  Record<keyof ProcedureFormValues, FieldErrorCode>
>;

export interface CreateAppointmentPayload {
  startsAt: string;
  status: AppointmentStatus;
  endsAt?: string;
  patientName?: string;
  procedureName?: string;
  clientId?: string;
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
  clientId: null,
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

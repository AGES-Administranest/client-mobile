export type Species = 'CANINE' | 'FELINE' | 'OTHER';

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

export const ASA_CLASSIFICATIONS = ['I', 'II', 'III', 'IV'] as const;

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
  | 'AGE_OUT_OF_RANGE'
  | 'END_BEFORE_START'
  | 'INVALID_DATE'
  | 'INVALID_TIME';

export type ProcedureErrors = Partial<
  Record<keyof ProcedureFormValues, FieldErrorCode>
>;

export interface CreateAppointmentPayload {
  status?: AppointmentStatus;
  startsAt: string;
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

export type AppointmentResult = {
  id: string;
  clientId: string | null;
  procedureName: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  amount: string | null;
  patientName: string | null;
  ownerName: string | null;
  species: Species | null;
  patientAgeYears: number | null;
  weightKg: string | null;
  asa: string | null;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AppointmentsQuery = {
  status?: AppointmentStatus;
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
};

export type ProcedureHistoryItem = {
  appointment: AppointmentResult;
  clientName: string | null;
};

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

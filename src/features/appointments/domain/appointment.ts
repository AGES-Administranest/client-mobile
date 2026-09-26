export type Species = 'canine' | 'feline';

export type AsaClass = 'I' | 'II' | 'III' | 'IV';

/** O enum `Species` do Prisma — é o que a API grava e devolve. */
export type BackendSpecies = 'CANINE' | 'FELINE' | 'OTHER';

export const SPECIES_OPTIONS: readonly Species[] = ['canine', 'feline'];

export const ASA_CLASSES: readonly AsaClass[] = ['I', 'II', 'III', 'IV'];

const TO_BACKEND_SPECIES: Record<Species, BackendSpecies> = {
  canine: 'CANINE',
  feline: 'FELINE',
};

/**
 * Um agendamento como a API o devolve.
 *
 * Os `Decimal` do Prisma chegam como string ('620.00'), igual ao
 * `defaultUnitCost` de `materials` — por isso `amount` e `weightKg` não são
 * `number` aqui.
 */
export type Appointment = {
  id: string;
  clientId: string | null;
  patientName: string | null;
  procedureName: string | null;
  startsAt: string;
  endsAt: string | null;
  amount: string | null;
  species: BackendSpecies | null;
  patientAgeYears: number | null;
  weightKg: string | null;
  asaClass: AsaClass | null;
  notes: string | null;
};

/** O `details.conflictingAppointment` de um 409 APPOINTMENT_TIME_CONFLICT. */
export type ConflictingAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  procedureName: string | null;
};

export type AppointmentDraft = {
  date: string;
  startTime: string;
  endTime: string;
  clientId: string | null;
  patientName: string;
  procedureName: string;
  amount: string;
  species: Species | null;
  ageYears: string;
  weightKg: string;
  asaClass: AsaClass | null;
  notes: string;
};

// Espécie já nasce escolhida porque é o estado que o design mostra ao abrir a
// folha; a classificação ASA é opcional, então começa sem seleção — deixá-la
// em 'I' faria o formulário afirmar um dado clínico que ninguém informou.
export const EMPTY_APPOINTMENT_DRAFT: AppointmentDraft = {
  date: '',
  startTime: '',
  endTime: '',
  clientId: null,
  patientName: '',
  procedureName: '',
  amount: '',
  species: 'canine',
  ageYears: '',
  weightKg: '',
  asaClass: null,
  notes: '',
};

export type AppointmentField =
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'clientId'
  | 'patientName'
  | 'procedureName'
  | 'amount'
  | 'species'
  | 'weightKg';

export type AppointmentErrorCode =
  | 'required'
  | 'invalidDate'
  | 'invalidTime'
  | 'endBeforeStart'
  | 'mustBePositive';

export type AppointmentErrors = Partial<
  Record<AppointmentField, AppointmentErrorCode>
>;

export type AppointmentPayload = {
  clientId: string;
  patientName: string;
  procedureName: string;
  startsAt: string;
  endsAt: string;
  amount: number;
  species: BackendSpecies;
  patientAgeYears: number | null;
  weightKg: number | null;
  asaClass: AsaClass | null;
  notes: string | null;
};

const MINUTES_IN_HOUR = 60;
const MAX_HOUR = 23;
const MAX_MINUTE = 59;
const TIME_DIGITS = 4;
const DATE_DIGITS = 8;
const MAX_AGE_DIGITS = 2;
const MAX_WEIGHT_INTEGER_DIGITS = 3;
const MAX_WEIGHT_DECIMAL_DIGITS = 3;
const MAX_AMOUNT_DIGITS = 11;
const CENTS_IN_UNIT = 100;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatAgeInput(value: string): string {
  return digitsOnly(value).slice(0, MAX_AGE_DIGITS);
}

// Peso aceita fração (2,5 kg), então a máscara não pode ser só dígitos: o
// separador digitado é preservado para que "2," não vire "2" a cada tecla.
export function formatWeightInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const [whole, ...rest] = cleaned.split(',');
  const integerPart = whole.slice(0, MAX_WEIGHT_INTEGER_DIGITS);

  if (rest.length === 0) {
    return integerPart;
  }

  return `${integerPart},${rest.join('').slice(0, MAX_WEIGHT_DECIMAL_DIGITS)}`;
}

export function formatTimeInput(value: string): string {
  const digits = digitsOnly(value).slice(0, TIME_DIGITS);

  return [digits.slice(0, 2), digits.slice(2, 4)]
    .filter(part => part.length > 0)
    .join(':');
}

export function formatDateInput(value: string): string {
  const digits = digitsOnly(value).slice(0, DATE_DIGITS);

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(part => part.length > 0)
    .join('/');
}

export function formatAmountInput(value: string): string {
  const digits = digitsOnly(value).slice(0, MAX_AMOUNT_DIGITS);

  if (digits.length === 0) {
    return '';
  }

  const cents = Number(digits);
  const units = Math.floor(cents / CENTS_IN_UNIT)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${units},${String(cents % CENTS_IN_UNIT).padStart(2, '0')}`;
}

export function parseAmount(value: string): number {
  const digits = digitsOnly(value);

  return digits.length === 0 ? Number.NaN : Number(digits) / CENTS_IN_UNIT;
}

export function parseAge(value: string): number {
  const digits = digitsOnly(value);

  return digits.length === 0 ? Number.NaN : Number(digits);
}

export function parseWeight(value: string): number {
  const normalised = value.trim().replace(',', '.');

  return normalised === '' ? Number.NaN : Number(normalised);
}

export function parseTimeToMinutes(value: string): number {
  const digits = digitsOnly(value);

  if (digits.length !== TIME_DIGITS) {
    return Number.NaN;
  }

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  if (hours > MAX_HOUR || minutes > MAX_MINUTE) {
    return Number.NaN;
  }

  return hours * MINUTES_IN_HOUR + minutes;
}

/** `21/09/2026` (o formato do campo mascarado) para `2026-09-21`. */
export function toIsoDate(value: string): string | null {
  const digits = digitsOnly(value);

  if (digits.length !== DATE_DIGITS) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const parsed = new Date(year, month - 1, day);

  const isRealDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  if (!isRealDate) {
    return null;
  }

  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/** `2026-09-21` (o dia do calendário, `shared/utils/calendar`) para `21/09/2026`. */
export function fromIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}/${month}/${year}`;
}

// A data e a hora são digitadas no fuso de quem está no atendimento, mas
// starts_at/ends_at são timestamptz: a combinação vira um instante absoluto
// aqui para que o backend não precise adivinhar o fuso do aparelho.
function toIsoDateTime(isoDate: string, time: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const minutes = parseTimeToMinutes(time);

  return new Date(
    year,
    month - 1,
    day,
    Math.floor(minutes / MINUTES_IN_HOUR),
    minutes % MINUTES_IN_HOUR,
  ).toISOString();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Um instante ISO da API para a hora local, no formato do campo (`08:30`). */
export function toTimeInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Um instante ISO da API para o dia local, no formato do campo. */
export function toDateInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);

  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

function fromBackendSpecies(species: BackendSpecies | null): Species | null {
  if (species === 'CANINE') {
    return 'canine';
  }

  if (species === 'FELINE') {
    return 'feline';
  }

  // OTHER e null não têm botão na folha: a espécie volta sem seleção e a
  // validação pede que alguém escolha, em vez de trocar o dado em silêncio.
  return null;
}

/** Rascunho da criação: vazio, com a data do dia escolhido no calendário. */
export function createDraft(selectedDate: string | null): AppointmentDraft {
  return {
    ...EMPTY_APPOINTMENT_DRAFT,
    date: selectedDate ? fromIsoDate(selectedDate) : '',
  };
}

/** Rascunho da edição: os campos preenchidos com o agendamento existente. */
export function appointmentToDraft(appointment: Appointment): AppointmentDraft {
  const amount =
    appointment.amount === null ? null : Number(appointment.amount);

  return {
    date: toDateInput(appointment.startsAt),
    startTime: toTimeInput(appointment.startsAt),
    endTime: appointment.endsAt ? toTimeInput(appointment.endsAt) : '',
    clientId: appointment.clientId,
    patientName: appointment.patientName ?? '',
    procedureName: appointment.procedureName ?? '',
    amount:
      amount === null
        ? ''
        : formatAmountInput(String(Math.round(amount * CENTS_IN_UNIT))),
    species: fromBackendSpecies(appointment.species),
    ageYears:
      appointment.patientAgeYears === null
        ? ''
        : String(appointment.patientAgeYears),
    weightKg:
      appointment.weightKg === null
        ? ''
        : formatWeightInput(String(Number(appointment.weightKg))),
    asaClass: appointment.asaClass,
    notes: appointment.notes ?? '',
  };
}

export function isDraftDirty(
  draft: AppointmentDraft,
  initial: AppointmentDraft,
): boolean {
  return (Object.keys(draft) as (keyof AppointmentDraft)[]).some(
    field => draft[field] !== initial[field],
  );
}

export function validateAppointmentDraft(
  draft: AppointmentDraft,
): AppointmentErrors {
  const errors: AppointmentErrors = {};

  if (draft.date.trim() === '') {
    errors.date = 'required';
  } else if (toIsoDate(draft.date) === null) {
    errors.date = 'invalidDate';
  }

  const startMinutes = parseTimeToMinutes(draft.startTime);
  const endMinutes = parseTimeToMinutes(draft.endTime);

  if (draft.startTime.trim() === '') {
    errors.startTime = 'required';
  } else if (Number.isNaN(startMinutes)) {
    errors.startTime = 'invalidTime';
  }

  if (draft.endTime.trim() === '') {
    errors.endTime = 'required';
  } else if (Number.isNaN(endMinutes)) {
    errors.endTime = 'invalidTime';
  } else if (!Number.isNaN(startMinutes) && endMinutes <= startMinutes) {
    errors.endTime = 'endBeforeStart';
  }

  if (draft.clientId === null) {
    errors.clientId = 'required';
  }

  if (draft.patientName.trim() === '') {
    errors.patientName = 'required';
  }

  if (draft.procedureName.trim() === '') {
    errors.procedureName = 'required';
  }

  // Zero é um valor válido: atendimento de cortesia, retorno incluso no
  // procedimento anterior. O campo só não pode ficar em branco — deixar de
  // informar é diferente de informar que não se cobrou nada.
  if (draft.amount.trim() === '') {
    errors.amount = 'required';
  }

  if (draft.species === null) {
    errors.species = 'required';
  }

  // Idade, peso, ASA e observações são opcionais: peso só é checado quando
  // preenchido, e os outros não têm como ficar inválidos.
  const weight = parseWeight(draft.weightKg);

  if (draft.weightKg.trim() !== '' && (Number.isNaN(weight) || weight <= 0)) {
    errors.weightKg = 'mustBePositive';
  }

  return errors;
}

export function isAppointmentValid(errors: AppointmentErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function toAppointmentPayload(
  draft: AppointmentDraft,
): AppointmentPayload | null {
  const isoDate = toIsoDate(draft.date);

  if (
    isoDate === null ||
    draft.clientId === null ||
    draft.species === null ||
    !isAppointmentValid(validateAppointmentDraft(draft))
  ) {
    return null;
  }

  const age = parseAge(draft.ageYears);
  const weight = parseWeight(draft.weightKg);
  const notes = draft.notes.trim();

  return {
    clientId: draft.clientId,
    patientName: draft.patientName.trim(),
    procedureName: draft.procedureName.trim(),
    startsAt: toIsoDateTime(isoDate, draft.startTime),
    endsAt: toIsoDateTime(isoDate, draft.endTime),
    amount: parseAmount(draft.amount),
    species: TO_BACKEND_SPECIES[draft.species],
    patientAgeYears: Number.isNaN(age) ? null : age,
    weightKg: Number.isNaN(weight) ? null : weight,
    asaClass: draft.asaClass,
    notes: notes === '' ? null : notes,
  };
}

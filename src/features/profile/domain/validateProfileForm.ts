import {
  BRAZILIAN_STATES,
  formatCrmvInput,
  isValidCrmv,
} from 'shared/utils/crmv';
import { parseDateInput } from 'shared/utils/inputMasks';

import type { Profile, Sex } from './profile';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 120;
export const CITY_MAX_LENGTH = 120;
export const MIN_AGE = 18;
const OLDEST_BIRTH_DATE = '1900-01-01';

export { BRAZILIAN_STATES, formatCrmvInput };

export type ProfileFormValues = {
  name: string;
  crmv: string;
  birthDate: string;
  sex: Sex | null;
  city: string;
  state: string;
};

export type ProfileFormField = keyof ProfileFormValues;

export type ProfileFormErrorCode =
  | 'nameTooShort'
  | 'nameTooLong'
  | 'crmvInvalid'
  | 'birthDateInvalid'
  | 'birthDateOutOfRange'
  | 'cityTooLong'
  | 'stateInvalid';

export type ProfileFormErrors = Partial<
  Record<ProfileFormField, ProfileFormErrorCode>
>;

export type ProfileUpdate = {
  name: string;
  crmv: string | null;
  birthDate: string | null;
  sex: Sex | null;
  city: string | null;
  state: string | null;
};

export function profileToFormValues(profile: Profile): ProfileFormValues {
  const [year, month, day] = profile.birthDate?.slice(0, 10).split('-') ?? [];

  return {
    name: profile.name,
    crmv: profile.crmv ?? '',
    birthDate: profile.birthDate ? `${day}/${month}/${year}` : '',
    sex: profile.sex,
    city: profile.city ?? '',
    state: profile.state ?? '',
  };
}

function toIsoDate(birthDate: string): string | null {
  const parsed = parseDateInput(birthDate);
  if (!parsed) return null;

  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function validateProfileForm(
  values: ProfileFormValues,
  today: string,
): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  const name = values.name.trim();
  if (name.length < NAME_MIN_LENGTH) {
    errors.name = 'nameTooShort';
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = 'nameTooLong';
  }

  const crmv = values.crmv.trim();
  if (crmv && !isValidCrmv(crmv)) {
    errors.crmv = 'crmvInvalid';
  }

  if (values.birthDate.trim()) {
    const birthDate = toIsoDate(values.birthDate);
    const latest = `${Number(today.slice(0, 4)) - MIN_AGE}${today.slice(4)}`;
    if (!birthDate) {
      errors.birthDate = 'birthDateInvalid';
    } else if (birthDate < OLDEST_BIRTH_DATE || birthDate > latest) {
      errors.birthDate = 'birthDateOutOfRange';
    }
  }

  if (values.city.trim().length > CITY_MAX_LENGTH) {
    errors.city = 'cityTooLong';
  }

  const state = values.state.trim().toUpperCase();
  if (state && !(BRAZILIAN_STATES as readonly string[]).includes(state)) {
    errors.state = 'stateInvalid';
  }

  return errors;
}

export function toProfileUpdate(values: ProfileFormValues): ProfileUpdate {
  const orNull = (value: string) => value.trim() || null;

  return {
    name: values.name.trim(),
    crmv: orNull(values.crmv.toUpperCase()),
    birthDate: values.birthDate.trim() ? toIsoDate(values.birthDate) : null,
    sex: values.sex,
    city: orNull(values.city),
    state: orNull(values.state.toUpperCase()),
  };
}

const SERVER_ERROR_CODES: Record<
  Exclude<ProfileFormField, 'sex'>,
  (message: string) => ProfileFormErrorCode
> = {
  name: message =>
    message.includes('shorter than') ? 'nameTooLong' : 'nameTooShort',
  crmv: () => 'crmvInvalid',
  birthDate: message =>
    message.includes('1900') ? 'birthDateOutOfRange' : 'birthDateInvalid',
  city: () => 'cityTooLong',
  state: () => 'stateInvalid',
};

export function serverFieldErrors(fields: unknown): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  if (!Array.isArray(fields)) return errors;

  for (const message of fields) {
    if (typeof message !== 'string') continue;
    const field = message.split(' ')[0] as keyof typeof SERVER_ERROR_CODES;
    if (field in SERVER_ERROR_CODES && !errors[field]) {
      errors[field] = SERVER_ERROR_CODES[field](message);
    }
  }
  return errors;
}

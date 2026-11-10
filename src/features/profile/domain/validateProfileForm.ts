import { digitsOnly, parseDateInput } from 'shared/utils/inputMasks';

import type { Profile, Sex } from './profile';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 120;
export const CITY_MAX_LENGTH = 120;
export const MIN_AGE = 18;
const OLDEST_BIRTH_DATE = '1900-01-01';
const CRMV_MAX_DIGITS = 6;

export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

const CRMV_PATTERN = new RegExp(
  `^(${BRAZILIAN_STATES.join('|')})-\\d{1,${CRMV_MAX_DIGITS}}$`,
);

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

export function formatCrmvInput(text: string): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const uf = /^[A-Z]{0,2}/.exec(clean)?.[0] ?? '';
  const digits = digitsOnly(clean.slice(uf.length)).slice(0, CRMV_MAX_DIGITS);

  return uf && digits ? `${uf}-${digits}` : uf || digits;
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

  const crmv = values.crmv.trim().toUpperCase();
  if (crmv && !CRMV_PATTERN.test(crmv)) {
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

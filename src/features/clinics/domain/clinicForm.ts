import type { CreateClientPayload } from './client';

export type ClinicDraft = {
  name: string;
  cnpj: string;
  addressLine: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  contactName: string;
};

export type ClinicField = keyof ClinicDraft;

type ClinicFieldErrorCodes = {
  name: 'required' | 'tooShort';
  cnpj: 'invalid';
  addressLine: never;
  city: never;
  state: 'invalid';
  phone: 'invalid';
  email: 'invalid';
  contactName: never;
};

export type ClinicDraftErrors = {
  [Field in ClinicField]?: ClinicFieldErrorCodes[Field];
};

export const CLINIC_FIELDS: readonly ClinicField[] = [
  'name',
  'cnpj',
  'addressLine',
  'city',
  'state',
  'phone',
  'email',
  'contactName',
];

export const EMPTY_CLINIC_DRAFT: ClinicDraft = {
  name: '',
  cnpj: '',
  addressLine: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  contactName: '',
};

// Mesmos limites do CreateClientDto: o input já corta no máximo, então o
// backend nunca recebe um texto maior do que aceita.
export const CLINIC_FIELD_MAX_LENGTH = {
  name: 120,
  addressLine: 200,
  city: 120,
  state: 2,
  contactName: 120,
} as const;

const NAME_MIN_LENGTH = 2;
const CNPJ_LENGTH = 14;
const PHONE_MIN_LENGTH = 10;
const PHONE_MAX_LENGTH = 11;

// A coluna `state` só limita o tamanho a 2 letras: sem esta lista, "XX"
// passaria no backend.
const BRAZILIAN_STATES = new Set([
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
]);

// O @IsEmail() do backend exige que o domínio termine numa extensão de 2+
// letras; sem isso, "a@b.c" passaria aqui e voltaria 400.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const FREE_TEXT_FIELDS = [
  'addressLine',
  'city',
  'email',
  'contactName',
] as const;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCnpj(value: string): string {
  const digits = digitsOnly(value).slice(0, CNPJ_LENGTH);
  const [root, second, third, branch, checkDigits] = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12),
  ];

  let formatted = root;
  if (second) {
    formatted += `.${second}`;
  }
  if (third) {
    formatted += `.${third}`;
  }
  if (branch) {
    formatted += `/${branch}`;
  }
  if (checkDigits) {
    formatted += `-${checkDigits}`;
  }
  return formatted;
}

export function formatPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, PHONE_MAX_LENGTH);
  if (digits.length === 0) {
    return '';
  }

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length === 0) {
    return `(${areaCode}`;
  }

  // Celular tem 9 dígitos depois do DDD e fixo tem 8: o hífen muda de lugar
  // quando o número passa de fixo para celular.
  const hyphenAt = number.length > 8 ? 5 : 4;
  const head = number.slice(0, hyphenAt);
  const tail = number.slice(hyphenAt);
  return tail ? `(${areaCode}) ${head}-${tail}` : `(${areaCode}) ${head}`;
}

export function normalizeState(value: string): string {
  return value
    .replace(/[^a-z]/gi, '')
    .toUpperCase()
    .slice(0, CLINIC_FIELD_MAX_LENGTH.state);
}

export function maskClinicField(field: ClinicField, value: string): string {
  switch (field) {
    case 'cnpj':
      return formatCnpj(value);
    case 'phone':
      return formatPhone(value);
    case 'state':
      return normalizeState(value);
    default:
      return value;
  }
}

export function validateClinicDraft(draft: ClinicDraft): ClinicDraftErrors {
  const errors: ClinicDraftErrors = {};

  const name = draft.name.trim();
  if (name === '') {
    errors.name = 'required';
  } else if (name.length < NAME_MIN_LENGTH) {
    errors.name = 'tooShort';
  }

  const cnpj = digitsOnly(draft.cnpj);
  if (cnpj !== '' && cnpj.length !== CNPJ_LENGTH) {
    errors.cnpj = 'invalid';
  }

  const state = draft.state.trim().toUpperCase();
  if (state !== '' && !BRAZILIAN_STATES.has(state)) {
    errors.state = 'invalid';
  }

  const phone = digitsOnly(draft.phone);
  if (
    phone !== '' &&
    (phone.length < PHONE_MIN_LENGTH || phone.length > PHONE_MAX_LENGTH)
  ) {
    errors.phone = 'invalid';
  }

  const email = draft.email.trim();
  if (email !== '' && !EMAIL_PATTERN.test(email)) {
    errors.email = 'invalid';
  }

  return errors;
}

export function isClinicDraftValid(errors: ClinicDraftErrors): boolean {
  return Object.keys(errors).length === 0;
}

// Campo vazio fica fora do payload: o backend aceita o campo ausente, mas
// `email: ""` não passa no @IsEmail() e volta 400 mesmo sendo opcional.
export function toCreateClientPayload(draft: ClinicDraft): CreateClientPayload {
  const payload: CreateClientPayload = {
    type: 'CLINIC',
    name: draft.name.trim(),
  };

  // tax_id e tax_id_type vão juntos ou nenhum dos dois vai.
  const cnpj = digitsOnly(draft.cnpj);
  if (cnpj) {
    payload.taxId = cnpj;
    payload.taxIdType = 'CNPJ';
  }

  const phone = digitsOnly(draft.phone);
  if (phone) {
    payload.phone = phone;
  }

  const state = normalizeState(draft.state);
  if (state) {
    payload.state = state;
  }

  for (const field of FREE_TEXT_FIELDS) {
    const value = draft[field].trim();
    if (value) {
      payload[field] = value;
    }
  }

  return payload;
}

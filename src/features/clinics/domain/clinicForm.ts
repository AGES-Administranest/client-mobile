import { z } from 'zod';

import type { Client, CreateClientPayload } from './client';

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
  addressLine: 'tooShort';
  city: 'required' | 'tooShort' | 'invalid';
  state: 'required' | 'invalid';
  phone: 'invalid';
  email: 'invalid';
  contactName: 'tooShort' | 'invalid';
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
const ADDRESS_MIN_LENGTH = 5;
const CNPJ_LENGTH = 14;
const PHONE_MAX_LENGTH = 11;
const EMAIL_MAX_LENGTH = 254;

// DDDs que existem de fato: "00" ou "10" passariam num teste só de tamanho.
const BRAZILIAN_AREA_CODES = new Set([
  ...'11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38'.split(
    ' ',
  ),
  ...'41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69'.split(
    ' ',
  ),
  ...'71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
]);

// Letras (com acento), espaço, ponto, hífen e apóstrofo: cobre "Dr. André",
// "Ribeirão Preto" e "D'Ávila", mas recusa números e símbolos.
const PERSON_OR_PLACE_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]+$/;

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

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== CNPJ_LENGTH || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const checkDigit = (length: number) => {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index++) {
      sum += Number(cnpj[index]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return (
    checkDigit(12) === Number(cnpj[12]) && checkDigit(13) === Number(cnpj[13])
  );
}

function isValidPhone(phone: string): boolean {
  const areaCode = phone.slice(0, 2);
  const number = phone.slice(2);
  if (!BRAZILIAN_AREA_CODES.has(areaCode)) {
    return false;
  }
  // Celular (11 dígitos) começa com 9; fixo (10) começa de 2 a 5.
  return number.length === 9 ? number[0] === '9' : /^[2-5]\d{7}$/.test(number);
}

// Campo opcional: vazio passa, preenchido tem de cumprir a regra.
const filled = (text: string) => text.trim() !== '';
const optionalText = () => z.string().trim();

const clinicDraftSchema = z
  .object({
    name: z.string().trim().min(1, 'required').min(NAME_MIN_LENGTH, 'tooShort'),
    cnpj: z
      .string()
      .refine(
        value => digitsOnly(value) === '' || isValidCnpj(digitsOnly(value)),
        'invalid',
      ),
    addressLine: optionalText().refine(
      value => !filled(value) || value.length >= ADDRESS_MIN_LENGTH,
      'tooShort',
    ),
    city: optionalText()
      .refine(value => !filled(value) || value.length >= 2, 'tooShort')
      .refine(
        value => !filled(value) || PERSON_OR_PLACE_PATTERN.test(value),
        'invalid',
      ),
    state: optionalText().refine(
      value => !filled(value) || BRAZILIAN_STATES.has(value.toUpperCase()),
      'invalid',
    ),
    phone: z
      .string()
      .refine(
        value =>
          digitsOnly(value) === '' ||
          ([10, 11].includes(digitsOnly(value).length) &&
            isValidPhone(digitsOnly(value))),
        'invalid',
      ),
    email: optionalText().refine(
      value =>
        !filled(value) ||
        (value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value)),
      'invalid',
    ),
    contactName: optionalText()
      .refine(value => !filled(value) || value.length >= 2, 'tooShort')
      .refine(
        value => !filled(value) || PERSON_OR_PLACE_PATTERN.test(value),
        'invalid',
      ),
  })
  // Cidade e UF andam juntas: uma sozinha deixa o endereço pela metade.
  .superRefine((draft, context) => {
    if (filled(draft.city) && !filled(draft.state)) {
      context.addIssue({
        code: 'custom',
        path: ['state'],
        message: 'required',
      });
    }
    if (filled(draft.state) && !filled(draft.city)) {
      context.addIssue({ code: 'custom', path: ['city'], message: 'required' });
    }
  });

// O `message` de cada regra é o código de erro; quem mostra o texto é a tela,
// via t(). Vale o primeiro erro de cada campo.
export function validateClinicDraft(draft: ClinicDraft): ClinicDraftErrors {
  const result = clinicDraftSchema.safeParse(draft);
  const errors: Partial<Record<ClinicField, string>> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ClinicField;
      errors[field] ??= issue.message;
    }
  }

  return errors as ClinicDraftErrors;
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

export function clientToClinicDraft(client: Client): ClinicDraft {
  return {
    name: client.name,
    cnpj:
      client.taxIdType === 'CNPJ' && client.taxId
        ? formatCnpj(client.taxId)
        : '',
    addressLine: client.addressLine ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    phone: formatPhone(client.phone ?? ''),
    email: client.email ?? '',
    contactName: client.contactName ?? '',
  };
}

// Campo esvaziado na edição volta a ser null, como um campo nunca preenchido.
export function applyClinicDraft(client: Client, draft: ClinicDraft): Client {
  const payload = toCreateClientPayload(draft);

  return {
    ...client,
    name: payload.name,
    taxId: payload.taxId ?? null,
    taxIdType: payload.taxIdType ?? null,
    addressLine: payload.addressLine ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    contactName: payload.contactName ?? null,
  };
}

import { isPtBrAmount } from 'shared/utils/amount';
import { currencyToNumber, parseDateInput } from 'shared/utils/inputMasks';

export type EquipmentFormValues = {
  name: string;
  purchaseValue: string;
  acquisitionDate: string;
  usefulLifeYears: string;
  notes: string;
};

export type EquipmentFormField = keyof EquipmentFormValues;

type EquipmentFormErrorCodes = {
  name: 'required' | 'tooShort' | 'tooLong';
  purchaseValue: 'required' | 'invalidNumber' | 'mustBePositive';
  acquisitionDate: 'required' | 'invalidDate' | 'futureDate';
  usefulLifeYears:
    | 'invalidNumber'
    | 'mustBeInteger'
    | 'mustBePositive'
    | 'tooLarge';
  notes: 'tooLong';
};

export type EquipmentFormErrors = {
  [Field in EquipmentFormField]?: EquipmentFormErrorCodes[Field];
};

export type NormalizedEquipmentForm = {
  name: string;
  purchaseValue: number;
  acquisitionDate: string;
  usefulLifeYears: number | null;
  notes: string;
};

export type EquipmentFormValidation = {
  errors: EquipmentFormErrors;
  normalized: NormalizedEquipmentForm | null;
};

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;
const NOTES_MAX_LENGTH = 1000;
const MAX_USEFUL_LIFE_YEARS = 100;

function validateName(raw: string): {
  name: string;
  error?: 'required' | 'tooShort' | 'tooLong';
} {
  const name = raw.trim();
  if (name === '') return { name, error: 'required' };
  if (name.length < NAME_MIN_LENGTH) return { name, error: 'tooShort' };
  if (name.length > NAME_MAX_LENGTH) return { name, error: 'tooLong' };
  return { name };
}

function validatePurchaseValue(raw: string): {
  value?: number;
  error?: 'required' | 'invalidNumber' | 'mustBePositive';
} {
  const text = raw.trim();
  if (text === '') return { error: 'required' };
  if (!isPtBrAmount(text)) return { error: 'invalidNumber' };
  const value = currencyToNumber(text);
  if (value <= 0) return { error: 'mustBePositive' };
  return { value };
}

function validateAcquisitionDate(
  raw: string,
  today: string,
): { iso?: string; error?: 'required' | 'invalidDate' | 'futureDate' } {
  if (raw.trim() === '') return { error: 'required' };
  if (!parseDateInput(raw)) return { error: 'invalidDate' };
  const [day, month, year] = raw
    .replace(/\D/g, '')
    .match(/^(\d{2})(\d{2})(\d{4})$/)!
    .slice(1);
  const iso = `${year}-${month}-${day}`;
  if (iso > today) return { error: 'futureDate' };
  return { iso };
}

function validateUsefulLifeYears(raw: string): {
  years?: number | null;
  error?: 'invalidNumber' | 'mustBeInteger' | 'mustBePositive' | 'tooLarge';
} {
  const text = raw.trim();
  if (text === '') return { years: null };
  if (/^-?\d+[.,]\d+$/.test(text)) return { error: 'mustBeInteger' };
  if (!/^-?\d+$/.test(text)) return { error: 'invalidNumber' };
  const years = Number(text);
  if (years <= 0) return { error: 'mustBePositive' };
  if (years > MAX_USEFUL_LIFE_YEARS) return { error: 'tooLarge' };
  return { years };
}

/**
 * `today` é o dia local em AAAA-MM-DD: recebê-lo por parâmetro mantém o teste
 * determinístico, e comparar strings evita o desvio de fuso que `new Date`
 * causaria em AAAA-MM-DD.
 */
export function validateEquipmentForm(
  values: EquipmentFormValues,
  today: string,
): EquipmentFormValidation {
  const errors: EquipmentFormErrors = {};

  const name = validateName(values.name);
  if (name.error) errors.name = name.error;

  const purchase = validatePurchaseValue(values.purchaseValue);
  if (purchase.error) errors.purchaseValue = purchase.error;

  const date = validateAcquisitionDate(values.acquisitionDate, today);
  if (date.error) errors.acquisitionDate = date.error;

  const life = validateUsefulLifeYears(values.usefulLifeYears);
  if (life.error) errors.usefulLifeYears = life.error;

  const notes = values.notes.trim();
  if (notes.length > NOTES_MAX_LENGTH) errors.notes = 'tooLong';

  if (Object.keys(errors).length > 0) return { errors, normalized: null };

  return {
    errors,
    normalized: {
      name: name.name,
      purchaseValue: purchase.value!,
      acquisitionDate: date.iso!,
      usefulLifeYears: life.years ?? null,
      notes,
    },
  };
}

// A prévia da depreciação recalcula a cada tecla, mesmo com os outros campos
// ainda inválidos; por isso cada campo tem a sua leitura isolada.
export function parsePurchaseValue(raw: string): number | null {
  return validatePurchaseValue(raw).value ?? null;
}

export function parseAcquisitionDate(raw: string): string | null {
  return validateAcquisitionDate(raw, '9999-12-31').iso ?? null;
}

/** `undefined`: o texto é inválido. `null`: o campo está vazio. */
export function parseUsefulLifeYears(raw: string): number | null | undefined {
  const { years, error } = validateUsefulLifeYears(raw);
  return error ? undefined : years;
}

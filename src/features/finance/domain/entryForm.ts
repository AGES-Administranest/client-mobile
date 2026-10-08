import { maskAmountInput, parseAmountInput } from './amountInput';
import {
  formatEntryDate,
  maskDateInput,
  parseEntryDate,
  toAccrualDate,
} from './entryDate';
import type {
  CreateFinancialEntryPayload,
  EntryNature,
  EntryScope,
  FinancialCategory,
} from './financialEntry';

export type EntryDraft = {
  nature: EntryNature;
  description: string;
  /** Como aparece no campo, com a máscara: "1.234,56". */
  amount: string;
  /** dd/mm/aaaa. */
  date: string;
  categoryId: string | null;
  scope: EntryScope;
};

export type EntryTextField = 'description' | 'amount' | 'date';

type EntryFieldErrorCodes = {
  description: 'required' | 'tooLong';
  amount: 'required' | 'invalid' | 'notPositive';
  date: 'required' | 'invalid';
  categoryId: 'required';
};

export type EntryField = keyof EntryFieldErrorCodes;

export type EntryDraftErrors = {
  [Field in EntryField]?: EntryFieldErrorCodes[Field];
};

export const DESCRIPTION_MAX_LENGTH = 500;

export function createEmptyDraft(today: Date): EntryDraft {
  return {
    nature: 'EXPENSE',
    description: '',
    amount: '',
    date: formatEntryDate(today),
    categoryId: null,
    scope: 'PROFESSIONAL',
  };
}

// Conta por caractere, como o MaxLength do backend: cortar por unidade UTF-16
// partiria um emoji ao meio e salvaria um "�" no fim da descrição.
const characters = (value: string) => Array.from(value);

const TEXT_MASKS: Record<EntryTextField, (value: string) => string> = {
  description: value =>
    characters(value).slice(0, DESCRIPTION_MAX_LENGTH).join(''),
  amount: maskAmountInput,
  date: maskDateInput,
};

export function maskEntryField(field: EntryTextField, value: string): string {
  return TEXT_MASKS[field](value);
}

/** Categoria é de um tipo só: trocar o tipo desfaz a escolha. */
export function changeNature(
  draft: EntryDraft,
  nature: EntryNature,
): EntryDraft {
  if (draft.nature === nature) {
    return draft;
  }
  return { ...draft, nature, categoryId: null };
}

/** O escopo vem sugerido pela categoria, mas continua editável. */
export function selectCategory(
  draft: EntryDraft,
  category: FinancialCategory,
): EntryDraft {
  return { ...draft, categoryId: category.id, scope: category.defaultScope };
}

function validateDescription(
  description: string,
): EntryDraftErrors['description'] {
  const trimmed = description.trim();
  if (!trimmed) {
    return 'required';
  }
  return characters(trimmed).length > DESCRIPTION_MAX_LENGTH
    ? 'tooLong'
    : undefined;
}

function validateAmount(amount: string): EntryDraftErrors['amount'] {
  if (!amount.trim()) {
    return 'required';
  }
  const value = parseAmountInput(amount);
  if (value === null) {
    return 'invalid';
  }
  return value > 0 ? undefined : 'notPositive';
}

function validateDate(date: string): EntryDraftErrors['date'] {
  if (!date.trim()) {
    return 'required';
  }
  return parseEntryDate(date) ? undefined : 'invalid';
}

export function validateEntryDraft(draft: EntryDraft): EntryDraftErrors {
  const errors: EntryDraftErrors = {
    description: validateDescription(draft.description),
    amount: validateAmount(draft.amount),
    date: validateDate(draft.date),
    categoryId: draft.categoryId ? undefined : 'required',
  };
  return Object.fromEntries(
    Object.entries(errors).filter(([, code]) => code !== undefined),
  ) as EntryDraftErrors;
}

export function isEntryDraftValid(errors: EntryDraftErrors): boolean {
  return Object.keys(errors).length === 0;
}

/** Só para rascunhos já validados: quem chama confere `isEntryDraftValid` antes. */
export function toCreatePayload(
  draft: EntryDraft,
  id: string,
): CreateFinancialEntryPayload {
  const amount = parseAmountInput(draft.amount);
  const date = parseEntryDate(draft.date);
  if (amount === null || !date || !draft.categoryId) {
    throw new Error('toCreatePayload needs a valid draft');
  }
  return {
    id,
    nature: draft.nature,
    description: draft.description.trim(),
    amount,
    accrualDate: toAccrualDate(date),
    categoryId: draft.categoryId,
    scope: draft.scope,
  };
}

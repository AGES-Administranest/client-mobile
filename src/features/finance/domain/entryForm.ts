import {
  maskAmountInput,
  parseMaskedAmount,
  type MaskedAmount,
} from './amountInput';
import {
  formatEntryDate,
  maskDateInput,
  parseEntryDate,
  toAccrualDate,
  type MaskedDate,
} from './entryDate';
import { lockedFieldsOf } from './entryOrigin';
import type {
  CreateFinancialEntryPayload,
  EntryNature,
  EntryScope,
  FinancialCategory,
  FinancialEntry,
  UpdateFinancialEntryPayload,
} from './financialEntry';

export type EntryDraft = {
  nature: EntryNature;
  description: string;
  amount: MaskedAmount;
  date: MaskedDate;
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

// Como o MaxLength do backend: cortar por .length partiria um emoji ao meio.
const codePoints = (value: string) => Array.from(value);

const TEXT_MASKS: Record<EntryTextField, (value: string) => string> = {
  description: value =>
    codePoints(value).slice(0, DESCRIPTION_MAX_LENGTH).join(''),
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
  return codePoints(trimmed).length > DESCRIPTION_MAX_LENGTH
    ? 'tooLong'
    : undefined;
}

function validateAmount(amount: MaskedAmount): EntryDraftErrors['amount'] {
  if (!amount.trim()) {
    return 'required';
  }
  const value = parseMaskedAmount(amount);
  if (value === null) {
    return 'invalid';
  }
  return value > 0 ? undefined : 'notPositive';
}

function validateDate(date: MaskedDate): EntryDraftErrors['date'] {
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

export function toCreatePayload(
  draft: EntryDraft,
  id: string,
): CreateFinancialEntryPayload {
  const amount = parseMaskedAmount(draft.amount);
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

/** O lançamento salvo no formato do formulário: o ponto de partida da edição. */
export function draftFromEntry(entry: FinancialEntry): EntryDraft {
  return {
    nature: entry.nature,
    description: entry.description,
    amount: maskAmountInput(entry.amount.toFixed(2)),
    date: formatEntryDate(new Date(entry.accrualDate)),
    categoryId: entry.category.id,
    scope: entry.scope,
  };
}

type DraftChanges = Record<keyof EntryDraft, boolean>;

function draftChanges(draft: EntryDraft, entry: FinancialEntry): DraftChanges {
  const saved = draftFromEntry(entry);
  return {
    nature: draft.nature !== saved.nature,
    description: draft.description.trim() !== saved.description.trim(),
    amount: draft.amount !== saved.amount,
    date: draft.date !== saved.date,
    categoryId: draft.categoryId !== saved.categoryId,
    scope: draft.scope !== saved.scope,
  };
}

export function hasDraftChanges(
  draft: EntryDraft,
  entry: FinancialEntry,
): boolean {
  return Object.values(draftChanges(draft, entry)).some(Boolean);
}

/**
 * Só os campos alterados. A data sai só se a pessoa mexeu nela: reenviar a de
 * um lançamento antigo trocaria o horário salvo pelo meio-dia.
 */
export function toUpdatePayload(
  draft: EntryDraft,
  entry: FinancialEntry,
): UpdateFinancialEntryPayload {
  const edited = toCreatePayload(draft, entry.id);
  const changed = draftChanges(draft, entry);
  const locked = lockedFieldsOf(entry);
  const payload: UpdateFinancialEntryPayload = {};
  if (changed.nature && !locked.includes('nature')) {
    payload.nature = edited.nature;
  }
  if (changed.description) {
    payload.description = edited.description;
  }
  if (changed.amount && !locked.includes('amount')) {
    payload.amount = edited.amount;
  }
  if (changed.date && !locked.includes('date')) {
    payload.accrualDate = edited.accrualDate;
  }
  if (changed.categoryId) {
    payload.categoryId = edited.categoryId;
  }
  if (changed.scope) {
    payload.scope = edited.scope;
  }
  return payload;
}

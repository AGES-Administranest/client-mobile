import type { FixedCostCategory } from './fixedCost';

export type FixedCostDraft = {
  description: string;
  monthlyAmount: string;
  category: FixedCostCategory | null;
};

export type FixedCostField = keyof FixedCostDraft;

export type FixedCostFieldError = 'required' | 'invalid';

export type FixedCostDraftErrors = Partial<
  Record<FixedCostField, FixedCostFieldError>
>;

export const EMPTY_FIXED_COST_DRAFT: FixedCostDraft = {
  description: '',
  monthlyAmount: '',
  category: null,
};

export type FixedCostPayload = {
  description: string;
  monthlyAmount: number;
  category: FixedCostCategory;
};

// "1.200,50" -> 1200.5; null para vazio ou qualquer coisa não numérica, para
// que vazio e "abc" caiam nos mesmos dois ramos que validateFixedCostDraft já
// distingue (required vs invalid).
export function parseMonthlyAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateFixedCostDraft(
  draft: FixedCostDraft,
): FixedCostDraftErrors {
  const errors: FixedCostDraftErrors = {};

  if (!draft.description.trim()) {
    errors.description = 'required';
  }

  if (!draft.monthlyAmount.trim()) {
    errors.monthlyAmount = 'required';
  } else {
    const amount = parseMonthlyAmount(draft.monthlyAmount);
    // Negativo, zero ou não numérico: nenhum passa como custo mensal válido.
    if (amount === null || amount <= 0) {
      errors.monthlyAmount = 'invalid';
    }
  }

  if (!draft.category) {
    errors.category = 'required';
  }

  return errors;
}

export function isFixedCostDraftValid(errors: FixedCostDraftErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function toFixedCostPayload(draft: FixedCostDraft): FixedCostPayload {
  return {
    description: draft.description.trim(),
    monthlyAmount: parseMonthlyAmount(draft.monthlyAmount) ?? 0,
    category: draft.category as FixedCostCategory,
  };
}

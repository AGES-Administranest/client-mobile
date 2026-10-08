import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  FINANCIAL_CATEGORY_INVALID: 'financialEntries.form.failures.categoryInvalid',
  FINANCIAL_ENTRY_ID_CONFLICT: 'financialEntries.form.failures.idConflict',
};

export function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

export function isCategoryInvalidError(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === 'FINANCIAL_CATEGORY_INVALID'
  );
}

/** Sessão e rede contam como no salvar; o resto vira "não carregou as categorias". */
export function toCategoriesFailureKey(error: unknown): TranslationKey {
  const key = toEntryFailureKey(error);
  return key === 'financialEntries.form.failures.session' ||
    key === 'financialEntries.form.failures.network'
    ? key
    : 'financialEntries.form.failures.categories';
}

export function toEntryFailureKey(error: unknown): TranslationKey {
  if (isNetworkError(error)) {
    return 'financialEntries.form.failures.network';
  }
  if (!(error instanceof ApiError)) {
    return 'financialEntries.form.failures.unknown';
  }
  if (error.status === 401) {
    return 'financialEntries.form.failures.session';
  }
  return (
    (error.code && FAILURE_KEYS[error.code]) ||
    'financialEntries.form.failures.unknown'
  );
}

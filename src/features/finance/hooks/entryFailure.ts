import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  FINANCIAL_CATEGORY_INVALID: 'financialEntries.form.failures.categoryInvalid',
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

export function isEntryNotFoundError(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === 'FINANCIAL_ENTRY_NOT_FOUND'
  );
}

export function duplicatedCategoryId(error: unknown): string | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== 'FINANCIAL_CATEGORY_DUPLICATED'
  ) {
    return null;
  }
  const id = error.details?.id;
  return typeof id === 'string' ? id : null;
}

export function isCategoryIdConflictError(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === 'FINANCIAL_CATEGORY_ID_CONFLICT'
  );
}

function sessionOrNetworkFailureKey(
  error: unknown,
  otherwise: TranslationKey,
): TranslationKey {
  const key = toEntryFailureKey(error);
  return key === 'financialEntries.form.failures.session' ||
    key === 'financialEntries.form.failures.network'
    ? key
    : otherwise;
}

export function toCategoriesFailureKey(error: unknown): TranslationKey {
  return sessionOrNetworkFailureKey(
    error,
    'financialEntries.form.failures.categories',
  );
}

export function toNewCategoryFailureKey(error: unknown): TranslationKey {
  return sessionOrNetworkFailureKey(
    error,
    'financialEntries.categoryField.createFailed',
  );
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

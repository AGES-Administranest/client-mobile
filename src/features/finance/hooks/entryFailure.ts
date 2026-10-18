import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  FINANCIAL_CATEGORY_INVALID: 'financialEntries.form.failures.categoryInvalid',
};

// Só a edição e a exclusão chegam a um lançamento que já existe: na criação,
// o 404 vem do PATCH de recuperação do 409 e não quer dizer "foi apagado".
const SAVED_ENTRY_FAILURE_KEYS: Record<string, TranslationKey> = {
  FINANCIAL_ENTRY_NOT_FOUND: 'financialEntries.detail.failures.notFound',
  FINANCIAL_ENTRY_CONTROLLED_BY_ORIGIN:
    'financialEntries.detail.failures.controlledByOrigin',
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

export function isDeleteViaOriginError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === 'FINANCIAL_ENTRY_DELETE_VIA_ORIGIN'
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

export function toStatementFailureKey(error: unknown): TranslationKey {
  const key = toEntryFailureKey(error);
  if (key === 'financialEntries.form.failures.session') {
    return 'financialEntries.statement.failures.session';
  }
  if (key === 'financialEntries.form.failures.network') {
    return 'financialEntries.statement.failures.network';
  }
  return 'financialEntries.statement.failures.unknown';
}

export function toEditFailureKey(error: unknown): TranslationKey {
  const code = error instanceof ApiError ? error.code : undefined;
  return (code && SAVED_ENTRY_FAILURE_KEYS[code]) || toEntryFailureKey(error);
}

export function toDeleteFailureKey(error: unknown): TranslationKey {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code && SAVED_ENTRY_FAILURE_KEYS[code]) {
    return SAVED_ENTRY_FAILURE_KEYS[code];
  }
  const key = toEntryFailureKey(error);
  return key === 'financialEntries.form.failures.session' ||
    key === 'financialEntries.form.failures.network'
    ? key
    : 'financialEntries.detail.failures.delete';
}

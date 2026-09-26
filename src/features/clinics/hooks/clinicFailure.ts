import type { TranslationKey } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

const FAILURE_KEYS: Record<string, TranslationKey> = {
  DUPLICATED_CLIENT_NAME: 'clinics.newClinic.failures.duplicatedName',
  DUPLICATED_CLIENT_TAX_ID: 'clinics.newClinic.failures.duplicatedTaxId',
};

export function requireToken(idToken: string | null): string {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
  return idToken;
}

export function toClinicFailureKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) {
    return 'clinics.newClinic.failures.unknown';
  }
  if (error.status === 401) {
    return 'clinics.newClinic.failures.session';
  }
  return (
    (error.code && FAILURE_KEYS[error.code]) ||
    'clinics.newClinic.failures.unknown'
  );
}

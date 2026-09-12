import { TranslationKey } from 'shared/i18n';

import { AuthError, AuthErrorCode } from '../domain/authErrors';
import { AuthFieldError } from '../domain/validateAuthForm';

// INVALID_CREDENTIALS stays a single generic message on purpose: the forms
// must not reveal which e-mails have an account (see README).
const ERROR_KEYS: Record<AuthErrorCode, TranslationKey> = {
  INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  EMAIL_ALREADY_REGISTERED: 'auth.errors.emailAlreadyRegistered',
  INVALID_CODE: 'auth.errors.invalidCode',
  EXPIRED_CODE: 'auth.errors.expiredCode',
  WEAK_PASSWORD: 'auth.errors.weakPassword',
  INVALID_PASSWORD_FORMAT: 'auth.errors.invalidData',
  USER_NOT_CONFIRMED: 'auth.errors.userNotConfirmed',
  SESSION_EXPIRED: 'auth.errors.sessionExpired',
  TOO_MANY_ATTEMPTS: 'auth.errors.tooManyAttempts',
  NETWORK_UNAVAILABLE: 'auth.errors.networkUnavailable',
  UNKNOWN: 'auth.errors.unknown',
};

const FIELD_ERROR_KEYS: Record<AuthFieldError, TranslationKey> = {
  required: 'auth.validation.required',
  invalidEmail: 'auth.validation.invalidEmail',
  passwordMismatch: 'auth.validation.passwordMismatch',
};

export function authErrorCodeOf(error: unknown): AuthErrorCode {
  return error instanceof AuthError ? error.code : 'UNKNOWN';
}

export function authErrorKey(error: unknown): TranslationKey {
  return ERROR_KEYS[authErrorCodeOf(error)];
}

export function fieldErrorKey(
  error: AuthFieldError | null | undefined,
): TranslationKey | undefined {
  return error ? FIELD_ERROR_KEYS[error] : undefined;
}

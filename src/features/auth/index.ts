export {
  AuthError,
  isRetryable,
  type AuthErrorCode,
} from './domain/authErrors';
export {
  isSessionExpired,
  shouldRefreshSession,
  type AuthSession,
} from './domain/session';
export {
  confirmForgotPassword,
  confirmSignUp,
  forgotPassword,
  refreshSession,
  resendConfirmationCode,
  signIn,
  signOut,
  signUp,
  type SignUpResult,
} from './services/authService';

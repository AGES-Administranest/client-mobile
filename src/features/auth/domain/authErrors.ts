// Authentication errors, translated from Cognito's vocabulary into ours.
//
// Screens never see an AWS `__type`: they see one of these codes and pick the
// dictionary string to show. That keeps i18n out of the service layer and
// keeps the account-enumeration rule (below) in a single place.

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CODE'
  | 'EXPIRED_CODE'
  | 'WEAK_PASSWORD'
  | 'INVALID_PASSWORD_FORMAT'
  | 'USER_NOT_CONFIRMED'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'NETWORK_UNAVAILABLE'
  | 'UNKNOWN';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

// Codes the app can clear by waiting or reconnecting, rather than by asking
// the user to change what they typed.
export function isRetryable(code: AuthErrorCode): boolean {
  return code === 'NETWORK_UNAVAILABLE' || code === 'TOO_MANY_ATTEMPTS';
}

/**
 * Translates the `__type` Cognito returns in an error body.
 *
 * The important part is `UserNotFoundException` mapping to the SAME code as
 * `NotAuthorizedException`: that is what stops someone from discovering which
 * e-mails have an account by trying logins one by one. The screen shows a
 * generic message because there is genuinely no more specific information
 * here for it to show.
 */
export function toAuthErrorCode(cognitoType: string): AuthErrorCode {
  switch (stripNamespace(cognitoType)) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'INVALID_CREDENTIALS';
    case 'UsernameExistsException':
      return 'EMAIL_ALREADY_REGISTERED';
    case 'CodeMismatchException':
      return 'INVALID_CODE';
    case 'ExpiredCodeException':
      return 'EXPIRED_CODE';
    case 'InvalidPasswordException':
      return 'WEAK_PASSWORD';
    case 'InvalidParameterException':
      return 'INVALID_PASSWORD_FORMAT';
    case 'UserNotConfirmedException':
      return 'USER_NOT_CONFIRMED';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
    case 'TooManyFailedAttemptsException':
      return 'TOO_MANY_ATTEMPTS';
    default:
      return 'UNKNOWN';
  }
}

// Cognito sometimes qualifies the type ("com.amazonaws...#NotAuthorizedException").
function stripNamespace(cognitoType: string): string {
  const separator = cognitoType.lastIndexOf('#');
  return separator === -1 ? cognitoType : cognitoType.slice(separator + 1);
}

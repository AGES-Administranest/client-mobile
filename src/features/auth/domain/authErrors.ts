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

export function isRetryable(code: AuthErrorCode): boolean {
  return code === 'NETWORK_UNAVAILABLE' || code === 'TOO_MANY_ATTEMPTS';
}

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

function stripNamespace(cognitoType: string): string {
  const separator = cognitoType.lastIndexOf('#');
  return separator === -1 ? cognitoType : cognitoType.slice(separator + 1);
}

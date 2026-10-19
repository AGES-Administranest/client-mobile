import { fromApiError, isRetryable, toAuthErrorCode } from './authErrors';

describe('toAuthErrorCode', () => {
  it('does not tell a wrong password apart from an unknown user', () => {
    expect(toAuthErrorCode('NotAuthorizedException')).toBe(
      'INVALID_CREDENTIALS',
    );
    expect(toAuthErrorCode('UserNotFoundException')).toBe(
      'INVALID_CREDENTIALS',
    );
  });

  it('understands a namespace-qualified type', () => {
    expect(
      toAuthErrorCode('com.amazonaws.cognito#UsernameExistsException'),
    ).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('maps the sign-up and confirmation-code errors', () => {
    expect(toAuthErrorCode('UsernameExistsException')).toBe(
      'EMAIL_ALREADY_REGISTERED',
    );
    expect(toAuthErrorCode('CodeMismatchException')).toBe('INVALID_CODE');
    expect(toAuthErrorCode('ExpiredCodeException')).toBe('EXPIRED_CODE');
    expect(toAuthErrorCode('InvalidPasswordException')).toBe('WEAK_PASSWORD');
  });

  it('falls back to UNKNOWN instead of breaking on a new type', () => {
    expect(toAuthErrorCode('SomethingAwsShippedYesterday')).toBe('UNKNOWN');
  });
});

describe('fromApiError', () => {
  it('names the e-mail conflict: it only happens to an authenticated person', () => {
    expect(fromApiError(409, 'USER_EMAIL_ALREADY_REGISTERED')).toBe(
      'ACCOUNT_USES_OTHER_SIGN_IN',
    );
  });

  it('does not read any other 409 as the e-mail conflict', () => {
    expect(fromApiError(409, 'DUPLICATED_ITEM_PRESENTATION')).toBe('UNKNOWN');
  });

  it('treats a rejected token as an expired session', () => {
    expect(fromApiError(401, 'TOKEN_EXPIRED')).toBe('SESSION_EXPIRED');
    expect(fromApiError(401, 'TOKEN_INVALID')).toBe('SESSION_EXPIRED');
  });

  it('maps throttling and falls back to UNKNOWN for server errors', () => {
    expect(fromApiError(429, 'TOO_MANY_REQUESTS')).toBe('TOO_MANY_ATTEMPTS');
    expect(fromApiError(500)).toBe('UNKNOWN');
  });
});

describe('isRetryable', () => {
  it('separates what is worth retrying from what needs different input', () => {
    expect(isRetryable('NETWORK_UNAVAILABLE')).toBe(true);
    expect(isRetryable('TOO_MANY_ATTEMPTS')).toBe(true);
    expect(isRetryable('INVALID_CREDENTIALS')).toBe(false);
  });
});

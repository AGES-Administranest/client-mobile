import { isRetryable, toAuthErrorCode } from './authErrors';

describe('toAuthErrorCode', () => {
  // The most important guarantee in this file: if these two ever diverge,
  // the login form starts revealing which e-mails have an account.
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

describe('isRetryable', () => {
  it('separates what is worth retrying from what needs different input', () => {
    expect(isRetryable('NETWORK_UNAVAILABLE')).toBe(true);
    expect(isRetryable('TOO_MANY_ATTEMPTS')).toBe(true);
    expect(isRetryable('INVALID_CREDENTIALS')).toBe(false);
  });
});

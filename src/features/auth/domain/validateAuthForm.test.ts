import {
  hasErrors,
  validateConfirmationCode,
  validateLoginForm,
  validateSignUpForm,
} from './validateAuthForm';

const VALID_SIGN_UP = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'Passw0rd@',
  passwordConfirmation: 'Passw0rd@',
};

describe('validateLoginForm', () => {
  it('accepts a filled form with a well-formed e-mail', () => {
    expect(
      validateLoginForm({ email: 'ana@example.com', password: 'x' }),
    ).toEqual({});
  });

  it('flags empty fields as required', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'required',
      password: 'required',
    });
  });

  it('treats a whitespace-only e-mail as required, not malformed', () => {
    expect(validateLoginForm({ email: '   ', password: 'x' })).toEqual({
      email: 'required',
    });
  });

  it.each(['ana', 'ana@', 'ana@example', '@example.com', 'a na@example.com'])(
    'rejects the malformed e-mail %p',
    email => {
      expect(validateLoginForm({ email, password: 'x' })).toEqual({
        email: 'invalidEmail',
      });
    },
  );

  it('ignores surrounding whitespace in the e-mail', () => {
    expect(
      validateLoginForm({ email: ' ana@example.com ', password: 'x' }),
    ).toEqual({});
  });
});

describe('validateSignUpForm', () => {
  it('accepts a complete form', () => {
    expect(validateSignUpForm(VALID_SIGN_UP)).toEqual({});
  });

  it('requires a non-blank name', () => {
    expect(validateSignUpForm({ ...VALID_SIGN_UP, name: '  ' })).toEqual({
      name: 'required',
    });
  });

  it('requires the password confirmation', () => {
    expect(
      validateSignUpForm({ ...VALID_SIGN_UP, passwordConfirmation: '' }),
    ).toEqual({ passwordConfirmation: 'required' });
  });

  it('flags a confirmation that does not match the password', () => {
    expect(
      validateSignUpForm({ ...VALID_SIGN_UP, passwordConfirmation: 'other' }),
    ).toEqual({ passwordConfirmation: 'passwordMismatch' });
  });

  it('keeps the login rules for e-mail and password', () => {
    expect(
      validateSignUpForm({ ...VALID_SIGN_UP, email: 'ana', password: '' }),
    ).toEqual({
      email: 'invalidEmail',
      password: 'required',
      passwordConfirmation: 'passwordMismatch',
    });
  });
});

describe('validateConfirmationCode', () => {
  it('requires a non-blank code', () => {
    expect(validateConfirmationCode(' ')).toBe('required');
  });

  it('accepts any non-blank code, leaving the format to Cognito', () => {
    expect(validateConfirmationCode('123456')).toBeNull();
  });
});

describe('hasErrors', () => {
  it('is false for an empty error map and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'required' })).toBe(true);
  });
});

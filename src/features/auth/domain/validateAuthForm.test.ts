import {
  hasErrors,
  maskConfirmationCode,
  validateConfirmationCode,
  validateLoginForm,
  validateSignUpForm,
  type SignUpForm,
} from './validateAuthForm';

const VALID_SIGN_UP: SignUpForm = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'Passw0rd@',
  passwordConfirmation: 'Passw0rd@',
  crmv: 'RS-12345',
  sex: null,
  acceptedTerms: true,
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

  it('requires accepting the terms of use and privacy policy', () => {
    expect(
      validateSignUpForm({ ...VALID_SIGN_UP, acceptedTerms: false }),
    ).toEqual({ acceptedTerms: 'termsRequired' });
  });

  it.each([
    ['RS-12345', {}],
    ['rs-12345', {}],
    ['', { crmv: 'required' }],
    ['   ', { crmv: 'required' }],
    ['XX-12345', { crmv: 'invalidCrmv' }],
    ['RS12345', { crmv: 'invalidCrmv' }],
    ['RS-1234567', { crmv: 'invalidCrmv' }],
  ])('checks the required CRMV %p', (crmv, expected) => {
    expect(validateSignUpForm({ ...VALID_SIGN_UP, crmv })).toEqual(expected);
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

  it('accepts a 6-digit code', () => {
    expect(validateConfirmationCode('123456')).toBeNull();
  });

  it.each(['12345', '1234567', '12 3456', 'abcdef'])(
    'rejects the malformed code %p',
    code => {
      expect(validateConfirmationCode(code)).toBe('invalidCode');
    },
  );
});

describe('maskConfirmationCode', () => {
  it('keeps only the first six digits', () => {
    expect(maskConfirmationCode('12a34-56789')).toBe('123456');
  });
});

describe('hasErrors', () => {
  it('is false for an empty error map and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'required' })).toBe(true);
  });
});

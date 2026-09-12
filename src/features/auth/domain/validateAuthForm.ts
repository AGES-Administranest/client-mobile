export type AuthFieldError = 'required' | 'invalidEmail' | 'passwordMismatch';

export type LoginForm = {
  email: string;
  password: string;
};

export type SignUpForm = LoginForm & {
  name: string;
  passwordConfirmation: string;
};

export type FormErrors<TForm> = Partial<Record<keyof TForm, AuthFieldError>>;

// Deliberately loose: it only catches typos before a round trip. Cognito is the
// authority on what a valid e-mail (and a strong enough password) is.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm(form: LoginForm): FormErrors<LoginForm> {
  const errors: FormErrors<LoginForm> = {};

  const emailError = validateEmail(form.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!form.password) {
    errors.password = 'required';
  }

  return errors;
}

export function validateSignUpForm(form: SignUpForm): FormErrors<SignUpForm> {
  const errors: FormErrors<SignUpForm> = validateLoginForm(form);

  if (!form.name.trim()) {
    errors.name = 'required';
  }

  if (!form.passwordConfirmation) {
    errors.passwordConfirmation = 'required';
  } else if (form.password !== form.passwordConfirmation) {
    errors.passwordConfirmation = 'passwordMismatch';
  }

  return errors;
}

export function validateConfirmationCode(code: string): AuthFieldError | null {
  return code.trim() ? null : 'required';
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

function validateEmail(email: string): AuthFieldError | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return 'required';
  }

  return EMAIL_PATTERN.test(trimmed) ? null : 'invalidEmail';
}

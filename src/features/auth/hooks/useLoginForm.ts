import { useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { useSubmit } from './useSubmit';
import { AuthError } from '../domain/authErrors';
import {
  FormErrors,
  hasErrors,
  LoginForm,
  validateLoginForm,
} from '../domain/validateAuthForm';

type UseLoginFormOptions = {
  // Cognito only reports an unconfirmed account after the password matched,
  // so sending the user to the confirmation step leaks nothing.
  onUnconfirmed: (email: string, password: string) => void;
};

export function useLoginForm({ onUnconfirmed }: UseLoginFormOptions) {
  const { signIn } = useAuth();
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<LoginForm>>({});

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof AuthError && error.code === 'USER_NOT_CONFIRMED') {
        onUnconfirmed(form.email.trim(), form.password);
        return true;
      }
      return false;
    },
    [form, onUnconfirmed],
  );

  const { isSubmitting, errorKey, run } = useSubmit(handleError);

  const setField = useCallback((field: keyof LoginForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  }, []);

  const submit = useCallback(() => {
    const validation = validateLoginForm(form);
    setErrors(validation);

    if (hasErrors(validation)) {
      return;
    }

    return run(() => signIn(form.email, form.password));
  }, [form, run, signIn]);

  return { form, errors, setField, submit, isSubmitting, errorKey };
}

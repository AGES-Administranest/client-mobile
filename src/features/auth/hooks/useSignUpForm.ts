import { useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { useSubmit } from './useSubmit';
import {
  FormErrors,
  hasErrors,
  SignUpForm,
  validateSignUpForm,
} from '../domain/validateAuthForm';
import { signUp } from '../services/authService';

type UseSignUpFormOptions = {
  onNeedsConfirmation: (email: string, password: string) => void;
};

const EMPTY_FORM: SignUpForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};

export function useSignUpForm({ onNeedsConfirmation }: UseSignUpFormOptions) {
  const { signIn } = useAuth();
  const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors<SignUpForm>>({});
  const { isSubmitting, errorKey, run } = useSubmit();

  const setField = useCallback((field: keyof SignUpForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  }, []);

  const submit = useCallback(() => {
    const validation = validateSignUpForm(form);
    setErrors(validation);

    if (hasErrors(validation)) {
      return;
    }

    const email = form.email.trim();

    return run(async () => {
      const result = await signUp(email, form.password, form.name.trim());

      if (result.isConfirmed) {
        await signIn(email, form.password);
      } else {
        onNeedsConfirmation(email, form.password);
      }
    });
  }, [form, onNeedsConfirmation, run, signIn]);

  return { form, errors, setField, submit, isSubmitting, errorKey };
}

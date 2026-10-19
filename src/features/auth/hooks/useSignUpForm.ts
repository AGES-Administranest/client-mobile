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
  acceptedTerms: false,
};

export function useSignUpForm({ onNeedsConfirmation }: UseSignUpFormOptions) {
  const { signIn } = useAuth();
  const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors<SignUpForm>>({});
  const { isSubmitting, errorKey, run } = useSubmit();

  const setField = useCallback(
    <TField extends keyof SignUpForm>(
      field: TField,
      value: SignUpForm[TField],
    ) => {
      setForm(current => ({ ...current, [field]: value }));
      setErrors(current => ({ ...current, [field]: undefined }));
    },
    [],
  );

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
        // The box was ticked above, so the account is opened with the terms
        // already recorded instead of asking again on the next screen.
        await signIn(email, form.password, { acceptTerms: true });
      } else {
        onNeedsConfirmation(email, form.password);
      }
    });
  }, [form, onNeedsConfirmation, run, signIn]);

  return { form, errors, setField, submit, isSubmitting, errorKey };
}

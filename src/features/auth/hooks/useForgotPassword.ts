import { useCallback, useState } from 'react';

import { useSubmit } from './useSubmit';
import { AuthFieldError, validateEmail } from '../domain/validateAuthForm';
import { forgotPassword } from '../services/authService';

type UseForgotPasswordOptions = {
  initialEmail?: string;
  onSent: (email: string) => void;
};

export function useForgotPassword({
  initialEmail = '',
  onSent,
}: UseForgotPasswordOptions) {
  const [email, setEmailValue] = useState(initialEmail);
  const [emailError, setEmailError] = useState<AuthFieldError | null>(null);

  const { isSubmitting, errorKey, run } = useSubmit();

  const setEmail = useCallback((value: string) => {
    setEmailValue(value);
    setEmailError(null);
  }, []);

  const submit = useCallback(() => {
    const validation = validateEmail(email);
    setEmailError(validation);

    if (validation) {
      return;
    }

    return run(async () => {
      const trimmed = email.trim();
      await forgotPassword(trimmed);
      onSent(trimmed);
    });
  }, [email, onSent, run]);

  return {
    email,
    emailError,
    setEmail,
    submit,
    isSubmitting,
    errorKey,
  };
}

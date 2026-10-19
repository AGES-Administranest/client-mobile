import { useCallback, useState } from 'react';

import { useSubmit } from './useSubmit';
import { AuthError } from '../domain/authErrors';
import { AuthFieldError, validateEmail } from '../domain/validateAuthForm';
import { forgotPassword } from '../services/authService';

type UseForgotPasswordOptions = {
  onSent: (email: string) => void;
};

export function useForgotPassword({ onSent }: UseForgotPasswordOptions) {
  const [email, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState<AuthFieldError | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof AuthError && error.code === 'EMAIL_NOT_FOUND') {
      setNotFound(true);
      return true;
    }
    return false;
  }, []);

  const { isSubmitting, errorKey, run } = useSubmit(handleError);

  const setEmail = useCallback((value: string) => {
    setEmailValue(value);
    setEmailError(null);
    setNotFound(false);
  }, []);

  const submit = useCallback(() => {
    const validation = validateEmail(email);
    setEmailError(validation);

    if (validation) {
      return;
    }

    setNotFound(false);

    return run(async () => {
      const trimmed = email.trim();
      await forgotPassword(trimmed);
      onSent(trimmed);
    });
  }, [email, onSent, run]);

  return {
    email,
    emailError,
    notFound,
    setEmail,
    submit,
    isSubmitting,
    errorKey,
  };
}

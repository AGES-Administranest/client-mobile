import { useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { useSubmit } from './useSubmit';
import { AuthFieldError } from '../domain/validateAuthForm';

// Drives the terms screen shown to an account that has not accepted the
// current version yet — typically someone who came in through Google and so
// never saw the sign-up form (US25).
export function useAcceptTerms() {
  const { account, acceptTerms, signOut } = useAuth();
  const [checked, setCheckedValue] = useState(false);
  const [checkError, setCheckError] = useState<AuthFieldError | null>(null);
  const { isSubmitting, errorKey, run } = useSubmit();

  const setChecked = useCallback((value: boolean) => {
    setCheckedValue(value);
    setCheckError(null);
  }, []);

  const submit = useCallback(() => {
    if (!checked) {
      setCheckError('termsRequired');
      return;
    }

    return run(acceptTerms);
  }, [acceptTerms, checked, run]);

  return {
    name: account?.name ?? '',
    checked,
    checkError,
    setChecked,
    submit,
    signOut,
    isSubmitting,
    errorKey,
  };
}

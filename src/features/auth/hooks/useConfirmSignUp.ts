import { useCallback, useEffect, useState } from 'react';

import { TranslationKey } from 'shared/i18n';

import { useAuth } from './AuthContext';
import { useSubmit } from './useSubmit';
import {
  AuthFieldError,
  validateConfirmationCode,
} from '../domain/validateAuthForm';
import { confirmSignUp, resendConfirmationCode } from '../services/authService';

type UseConfirmSignUpOptions = {
  email: string;
  // Kept only for the duration of the flow, so confirming signs the user in
  // without asking for the password a second time.
  password: string;
  // True when arriving from login: Cognito does not send a new code on its own.
  resendOnMount?: boolean;
};

export function useConfirmSignUp({
  email,
  password,
  resendOnMount = false,
}: UseConfirmSignUpOptions) {
  const { signIn } = useAuth();
  const [code, setCodeValue] = useState('');
  const [codeError, setCodeError] = useState<AuthFieldError | null>(null);
  const [noticeKey, setNoticeKey] = useState<TranslationKey | null>(null);
  const { isSubmitting, errorKey, run } = useSubmit();

  const setCode = useCallback((value: string) => {
    setCodeValue(value);
    setCodeError(null);
  }, []);

  const submit = useCallback(() => {
    const validation = validateConfirmationCode(code);
    setCodeError(validation);

    if (validation) {
      return;
    }

    setNoticeKey(null);

    return run(async () => {
      await confirmSignUp(email, code.trim());
      await signIn(email, password);
    });
  }, [code, email, password, run, signIn]);

  const resend = useCallback(() => {
    setNoticeKey(null);

    return run(async () => {
      await resendConfirmationCode(email);
      setNoticeKey('auth.confirm.resent');
    });
  }, [email, run]);

  useEffect(() => {
    if (resendOnMount) {
      resend();
    }
    // Only on arrival — not every time `resend` changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    code,
    codeError,
    setCode,
    submit,
    resend,
    isSubmitting,
    errorKey,
    noticeKey,
  };
}

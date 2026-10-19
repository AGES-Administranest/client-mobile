import { useCallback, useMemo, useState } from 'react';

import { useSubmit } from './useSubmit';
import { AuthError } from '../domain/authErrors';
import {
  PASSWORD_REQUIREMENTS,
  PasswordRequirement,
  RequirementStatus,
  requirementStatus,
  validateNewPassword,
} from '../domain/passwordReset';
import { confirmForgotPassword } from '../services/authService';

type UseResetPasswordOptions = {
  email: string;
  // The reset code (Cognito) or link token. Empty when the screen has to ask.
  token: string;
  onSuccess: () => void;
  onExpired: () => void;
};

export type RequirementItem = {
  requirement: PasswordRequirement;
  status: RequirementStatus;
};

export function useResetPassword({
  email,
  token,
  onSuccess,
  onExpired,
}: UseResetPasswordOptions) {
  const [code, setCode] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirmation, setConfirmationValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [codeMissing, setCodeMissing] = useState(false);

  const needsCode = token === '';
  const validation = useMemo(
    () => validateNewPassword(password, confirmation),
    [password, confirmation],
  );

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof AuthError && error.code === 'EXPIRED_CODE') {
        onExpired();
        return true;
      }
      return false;
    },
    [onExpired],
  );

  const { isSubmitting, errorKey, run } = useSubmit(handleError);

  const submit = useCallback(() => {
    setAttempted(true);
    const missingCode = needsCode && code.trim() === '';
    setCodeMissing(missingCode);

    if (missingCode || !validation.isValid) {
      return;
    }

    return run(async () => {
      await confirmForgotPassword(
        email,
        needsCode ? code.trim() : token,
        password,
      );
      onSuccess();
    });
  }, [code, email, needsCode, onSuccess, password, run, token, validation]);

  const changeCode = useCallback((value: string) => {
    setCode(value);
    setCodeMissing(false);
  }, []);

  const requirements: RequirementItem[] = PASSWORD_REQUIREMENTS.map(
    requirement => ({
      requirement,
      status: requirementStatus(
        validation.requirements[requirement],
        attempted,
      ),
    }),
  );

  return {
    needsCode,
    code,
    codeMissing,
    changeCode,
    password,
    setPassword: setPasswordValue,
    confirmation,
    setConfirmation: setConfirmationValue,
    requirements,
    showRequirementsError: attempted && !validation.meetsRequirements,
    confirmationState: !validation.confirmationFilled
      ? ('empty' as const)
      : validation.matches
      ? ('match' as const)
      : ('mismatch' as const),
    submit,
    isSubmitting,
    errorKey,
  };
}

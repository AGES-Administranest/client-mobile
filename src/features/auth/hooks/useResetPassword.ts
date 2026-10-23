import { useCallback, useMemo, useState } from 'react';

import { useSubmit } from './useSubmit';
import { AuthError } from '../domain/authErrors';
import {
  PASSWORD_REQUIREMENTS,
  NewPasswordValidation,
  PasswordRequirement,
  RequirementStatus,
  requirementStatus,
  validateNewPassword,
} from '../domain/passwordReset';
import { confirmForgotPassword } from '../services/authService';

type UseResetPasswordOptions = {
  email: string;
  onSuccess: () => void;
  onExpired: () => void;
};

export type RequirementItem = {
  requirement: PasswordRequirement;
  status: RequirementStatus;
};

function confirmationStateOf({
  confirmationFilled,
  matches,
}: NewPasswordValidation) {
  if (!confirmationFilled) {
    return 'empty' as const;
  }
  return matches ? ('match' as const) : ('mismatch' as const);
}

export function useResetPassword({
  email,
  onSuccess,
  onExpired,
}: UseResetPasswordOptions) {
  const [code, setCode] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirmation, setConfirmationValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [codeMissing, setCodeMissing] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);

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
      // Wrong code: stays on this screen with the error on the code field.
      if (error instanceof AuthError && error.code === 'INVALID_CODE') {
        setCodeInvalid(true);
        return true;
      }
      return false;
    },
    [onExpired],
  );

  const { isSubmitting, errorKey, run } = useSubmit(handleError);

  const submit = useCallback(() => {
    setAttempted(true);
    const missingCode = code.trim() === '';
    setCodeMissing(missingCode);
    setCodeInvalid(false);

    if (missingCode || !validation.isValid) {
      return;
    }

    return run(async () => {
      await confirmForgotPassword(email, code.trim(), password);
      onSuccess();
    });
  }, [code, email, onSuccess, password, run, validation]);

  const changeCode = useCallback((value: string) => {
    setCode(value);
    setCodeMissing(false);
    setCodeInvalid(false);
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
    code,
    codeMissing,
    codeInvalid,
    changeCode,
    password,
    setPassword: setPasswordValue,
    confirmation,
    setConfirmation: setConfirmationValue,
    requirements,
    showRequirementsError: attempted && !validation.meetsRequirements,
    confirmationState: confirmationStateOf(validation),
    submit,
    isSubmitting,
    errorKey,
  };
}

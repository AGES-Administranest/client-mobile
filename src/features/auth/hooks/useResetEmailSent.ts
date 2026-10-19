import { useCallback } from 'react';

import { useResendCountdown } from './useResendCountdown';
import { useSubmit } from './useSubmit';
import { forgotPassword } from '../services/authService';

export function useResetEmailSent(email: string) {
  const countdown = useResendCountdown();
  const { isSubmitting, errorKey, run } = useSubmit();

  const resend = useCallback(() => {
    if (!countdown.canResend) {
      return;
    }

    return run(async () => {
      await forgotPassword(email);
      countdown.restart();
    });
  }, [countdown, email, run]);

  return {
    countdownLabel: countdown.label,
    canResend: countdown.canResend,
    resend,
    isSubmitting,
    errorKey,
  };
}

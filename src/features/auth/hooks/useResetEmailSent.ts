import { useCallback, useEffect, useRef } from 'react';

import { useResendCountdown } from './useResendCountdown';
import { useSubmit } from './useSubmit';
import { forgotPassword } from '../services/authService';

export function useResetEmailSent(email: string) {
  const countdown = useResendCountdown();
  const { isSubmitting, errorKey, run } = useSubmit();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const resend = useCallback(() => {
    if (!countdown.canResend) {
      return;
    }

    return run(async () => {
      await forgotPassword(email);
      if (isMounted.current) {
        countdown.restart();
      }
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

import { useCallback, useEffect, useState } from 'react';

import {
  canResend,
  formatCountdown,
  secondsUntilResend,
} from '../domain/passwordReset';

// Counts down from the moment the e-mail was sent; `restart` begins a new
// cooldown after a resend.
export function useResendCountdown() {
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(sentAt);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const restart = useCallback(() => {
    const current = Date.now();
    setSentAt(current);
    setNow(current);
  }, []);

  const secondsRemaining = secondsUntilResend(sentAt, now);

  return {
    label: formatCountdown(secondsRemaining),
    canResend: canResend(secondsRemaining),
    restart,
  };
}

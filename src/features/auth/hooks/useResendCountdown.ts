import { useCallback, useEffect, useState } from 'react';

import {
  canResend,
  formatCountdown,
  secondsUntilResend,
} from '../domain/passwordReset';

export function useResendCountdown() {
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(sentAt);

  const secondsRemaining = secondsUntilResend(sentAt, now);
  const isCounting = !canResend(secondsRemaining);

  // Past zero there is nothing left to update: a ticking interval would
  // re-render the screen every second for the whole time it stays open.
  useEffect(() => {
    if (!isCounting) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isCounting]);

  const restart = useCallback(() => {
    const current = Date.now();
    setSentAt(current);
    setNow(current);
  }, []);

  return {
    label: formatCountdown(secondsRemaining),
    canResend: canResend(secondsRemaining),
    restart,
  };
}

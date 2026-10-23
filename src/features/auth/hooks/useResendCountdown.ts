import { useEffect, useState } from 'react';

import {
  canResend,
  formatCountdown,
  secondsUntilResend,
} from '../domain/passwordReset';

export function useResendCountdown(sentAt: number) {
  const [now, setNow] = useState(() => Date.now());

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

  return {
    label: formatCountdown(secondsRemaining),
    canResend: canResend(secondsRemaining),
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { TranslationKey } from 'shared/i18n';

import { authErrorKey } from './authMessageKeys';
import { AuthError } from '../domain/authErrors';

type SubmitState = {
  isSubmitting: boolean;
  errorKey: TranslationKey | null;
  run: (action: () => Promise<void>) => Promise<void>;
  clearError: () => void;
};

// Shared submit plumbing for the auth forms: one request at a time, and any
// failure becomes a dictionary key the screen can translate.
export function useSubmit(
  onError?: (error: unknown) => boolean | void,
): SubmitState {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const isMounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      if (inFlight.current) {
        return;
      }

      inFlight.current = true;
      setIsSubmitting(true);
      setErrorKey(null);

      try {
        await action();
      } catch (error) {
        // Anything that is not an AuthError is a bug or a misconfiguration
        // (e.g. a missing .env) — the user sees the generic message, so leave
        // a trace for whoever is developing.
        if (__DEV__ && !(error instanceof AuthError)) {
          console.warn(error);
        }

        // Returning true means the caller handled it (e.g. by navigating).
        const handled = onError?.(error) === true;
        if (!handled && isMounted.current) {
          setErrorKey(authErrorKey(error));
        }
      } finally {
        inFlight.current = false;
        if (isMounted.current) {
          setIsSubmitting(false);
        }
      }
    },
    [onError],
  );

  const clearError = useCallback(() => setErrorKey(null), []);

  return { isSubmitting, errorKey, run, clearError };
}

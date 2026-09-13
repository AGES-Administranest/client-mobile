import { useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { useSubmit } from './useSubmit';
import { SocialProvider } from '../domain/socialSignIn';

// Drives the "continue with Google / Apple" buttons: one provider at a time,
// the pressed one shows the spinner, and backing out shows no error.
export function useSocialSignIn() {
  const { signInWithProvider } = useAuth();
  const { isSubmitting, errorKey, run } = useSubmit();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );

  const signInWith = useCallback(
    (provider: SocialProvider) =>
      run(async () => {
        setPendingProvider(provider);
        try {
          await signInWithProvider(provider);
        } finally {
          setPendingProvider(null);
        }
      }),
    [run, signInWithProvider],
  );

  return {
    signInWith,
    pendingProvider,
    isSubmitting,
    errorKey,
  };
}

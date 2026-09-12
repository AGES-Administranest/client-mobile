import { useCallback, useState } from 'react';

export type AuthStep =
  | { name: 'welcome' }
  | { name: 'login' }
  | { name: 'signUp' }
  | {
      name: 'confirm';
      email: string;
      password: string;
      resendOnMount: boolean;
      from: 'login' | 'signUp';
    };

// No navigation library yet, so the unauthenticated flow is a small state
// machine. Once the app adopts one, each step becomes a route.
export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>({ name: 'welcome' });

  const goToWelcome = useCallback(() => setStep({ name: 'welcome' }), []);
  const goToLogin = useCallback(() => setStep({ name: 'login' }), []);
  const goToSignUp = useCallback(() => setStep({ name: 'signUp' }), []);

  const confirmAfterSignUp = useCallback(
    (email: string, password: string) =>
      setStep({
        name: 'confirm',
        email,
        password,
        resendOnMount: false,
        from: 'signUp',
      }),
    [],
  );

  const confirmAfterLogin = useCallback(
    (email: string, password: string) =>
      setStep({
        name: 'confirm',
        email,
        password,
        resendOnMount: true,
        from: 'login',
      }),
    [],
  );

  return {
    step,
    goToWelcome,
    goToLogin,
    goToSignUp,
    confirmAfterSignUp,
    confirmAfterLogin,
  };
}

import { useCallback, useState } from 'react';

export type AuthStep =
  | { name: 'welcome' }
  | { name: 'login' }
  | { name: 'signUp' }
  | { name: 'forgotPassword'; email?: string }
  | { name: 'resetEmailSent'; email: string; sentAt: number }
  | { name: 'resetPassword'; email: string; sentAt: number }
  | { name: 'codeExpired'; email: string }
  | { name: 'resetSuccess' }
  | {
      name: 'confirm';
      email: string;
      password: string;
      resendOnMount: boolean;
      from: 'login' | 'signUp';
      // True only when coming from sign-up, where the terms box was ticked.
      acceptTerms: boolean;
    };

// No navigation library yet, so the unauthenticated flow is a small state
// machine. Once the app adopts one, each step becomes a route.
export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>({ name: 'welcome' });

  const goToWelcome = useCallback(() => setStep({ name: 'welcome' }), []);
  const goToLogin = useCallback(() => setStep({ name: 'login' }), []);
  const goToSignUp = useCallback(() => setStep({ name: 'signUp' }), []);

  const goToForgotPassword = useCallback(
    (email?: string) => setStep({ name: 'forgotPassword', email }),
    [],
  );
  // `sentAt` lives in the step so that leaving for the code form and coming
  // back keeps the cooldown of the e-mail that was actually sent.
  const resetEmailSent = useCallback(
    (email: string, sentAt: number = Date.now()) =>
      setStep({ name: 'resetEmailSent', email, sentAt }),
    [],
  );
  const resetEmailResent = useCallback(
    () =>
      setStep(current =>
        current.name === 'resetEmailSent'
          ? { ...current, sentAt: Date.now() }
          : current,
      ),
    [],
  );
  const goToResetPassword = useCallback(
    (email: string, sentAt: number) =>
      setStep({ name: 'resetPassword', email, sentAt }),
    [],
  );
  const resetCodeExpired = useCallback(
    (email: string) => setStep({ name: 'codeExpired', email }),
    [],
  );
  const resetSucceeded = useCallback(
    () => setStep({ name: 'resetSuccess' }),
    [],
  );

  const confirmAfterSignUp = useCallback(
    (email: string, password: string) =>
      setStep({
        name: 'confirm',
        email,
        password,
        resendOnMount: false,
        from: 'signUp',
        acceptTerms: true,
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
        acceptTerms: false,
      }),
    [],
  );

  return {
    step,
    goToWelcome,
    goToLogin,
    goToSignUp,
    goToForgotPassword,
    resetEmailSent,
    resetEmailResent,
    goToResetPassword,
    resetCodeExpired,
    resetSucceeded,
    confirmAfterSignUp,
    confirmAfterLogin,
  };
}

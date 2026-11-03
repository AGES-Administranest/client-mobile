import { CodeExpiredScreen } from './CodeExpiredScreen';
import { ConfirmSignUpScreen } from './ConfirmSignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { LoginScreen } from './LoginScreen';
import { ResetEmailSentScreen } from './ResetEmailSentScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { ResetSuccessScreen } from './ResetSuccessScreen';
import { SignUpScreen } from './SignUpScreen';
import { WelcomeScreen } from './WelcomeScreen';
import { useAuthFlow } from '../hooks/useAuthFlow';

// Everything a signed-out user can reach. Signing in updates the AuthProvider
// session, and App swaps this flow for the tabs.
export function AuthFlow() {
  const {
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
  } = useAuthFlow();

  switch (step.name) {
    case 'login':
      return (
        <LoginScreen
          onBack={goToWelcome}
          onCreateAccount={goToSignUp}
          onForgotPassword={() => goToForgotPassword()}
          onUnconfirmed={confirmAfterLogin}
        />
      );
    case 'signUp':
      return (
        <SignUpScreen
          onBack={goToWelcome}
          onLogin={goToLogin}
          onNeedsConfirmation={confirmAfterSignUp}
        />
      );
    case 'confirm':
      return (
        <ConfirmSignUpScreen
          email={step.email}
          password={step.password}
          resendOnMount={step.resendOnMount}
          acceptTerms={step.acceptTerms}
          onBack={step.from === 'login' ? goToLogin : goToSignUp}
        />
      );
    case 'forgotPassword':
      return (
        <ForgotPasswordScreen
          initialEmail={step.email}
          onBack={goToLogin}
          onSent={resetEmailSent}
        />
      );
    case 'resetEmailSent':
      return (
        <ResetEmailSentScreen
          email={step.email}
          sentAt={step.sentAt}
          onBack={() => goToForgotPassword(step.email)}
          onBackToLogin={goToLogin}
          onHaveCode={() => goToResetPassword(step.email, step.sentAt)}
          onResent={resetEmailResent}
        />
      );
    case 'resetPassword':
      return (
        <ResetPasswordScreen
          email={step.email}
          onBack={() => resetEmailSent(step.email, step.sentAt)}
          onSuccess={resetSucceeded}
          onExpired={() => resetCodeExpired(step.email)}
        />
      );
    case 'codeExpired':
      return (
        <CodeExpiredScreen
          onBack={goToLogin}
          onRequestNewCode={() => goToForgotPassword(step.email)}
          onBackToLogin={goToLogin}
        />
      );
    case 'resetSuccess':
      return <ResetSuccessScreen onGoToLogin={goToLogin} />;
    default:
      return <WelcomeScreen onCreateAccount={goToSignUp} onLogin={goToLogin} />;
  }
}

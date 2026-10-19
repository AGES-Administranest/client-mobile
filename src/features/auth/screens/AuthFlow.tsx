import { ConfirmSignUpScreen } from './ConfirmSignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { LinkExpiredScreen } from './LinkExpiredScreen';
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
    goToResetPassword,
    resetLinkExpired,
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
          onForgotPassword={goToForgotPassword}
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
        <ForgotPasswordScreen onBack={goToLogin} onSent={resetEmailSent} />
      );
    case 'resetEmailSent':
      return (
        <ResetEmailSentScreen
          email={step.email}
          onBack={goToForgotPassword}
          onBackToLogin={goToLogin}
          onHaveCode={() => goToResetPassword(step.email)}
        />
      );
    case 'resetPassword':
      return (
        <ResetPasswordScreen
          email={step.email}
          token={step.token}
          onBack={() => resetEmailSent(step.email)}
          onSuccess={resetSucceeded}
          onExpired={() => resetLinkExpired(step.email)}
        />
      );
    case 'linkExpired':
      return (
        <LinkExpiredScreen
          onBack={goToLogin}
          onRequestNewLink={goToForgotPassword}
          onBackToLogin={goToLogin}
        />
      );
    case 'resetSuccess':
      return <ResetSuccessScreen onGoToLogin={goToLogin} />;
    default:
      return <WelcomeScreen onCreateAccount={goToSignUp} onLogin={goToLogin} />;
  }
}

import { ConfirmSignUpScreen } from './ConfirmSignUpScreen';
import { LoginScreen } from './LoginScreen';
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
    confirmAfterSignUp,
    confirmAfterLogin,
  } = useAuthFlow();

  switch (step.name) {
    case 'login':
      return (
        <LoginScreen
          onBack={goToWelcome}
          onCreateAccount={goToSignUp}
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
          onBack={step.from === 'login' ? goToLogin : goToSignUp}
        />
      );
    default:
      return <WelcomeScreen onCreateAccount={goToSignUp} onLogin={goToLogin} />;
  }
}

import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { OrDivider } from '../components/OrDivider';
import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { TextField } from '../components/TextField';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useLoginForm } from '../hooks/useLoginForm';
import { useSocialSignIn } from '../hooks/useSocialSignIn';

type LoginScreenProps = {
  onBack: () => void;
  onCreateAccount: () => void;
  onUnconfirmed: (email: string, password: string) => void;
};

export function LoginScreen({
  onBack,
  onCreateAccount,
  onUnconfirmed,
}: LoginScreenProps) {
  const { t } = useTranslation();
  const { form, errors, setField, submit, isSubmitting, errorKey } =
    useLoginForm({ onUnconfirmed });
  const social = useSocialSignIn();

  const fieldError = (field: keyof typeof errors) => {
    const key = fieldErrorKey(errors[field]);
    return key ? t(key) : undefined;
  };

  return (
    <AuthLayout
      title={t('auth.login.title')}
      description={t('auth.login.description')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.fields.email')}
        value={form.email}
        onChangeText={value => setField('email', value)}
        error={fieldError('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.password')}
        value={form.password}
        onChangeText={value => setField('password', value)}
        error={fieldError('password')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!isSubmitting}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />

      <AuthButton
        label={t('auth.login.submit')}
        onPress={submit}
        isLoading={isSubmitting}
        disabled={social.isSubmitting}
        className="mt-2"
      />

      <OrDivider label={t('auth.social.divider')} />
      <SocialSignInButtons
        labels={{
          Google: t('auth.social.google'),
          SignInWithApple: t('auth.social.apple'),
        }}
        onPress={social.signInWith}
        pendingProvider={social.pendingProvider}
        disabled={isSubmitting || social.isSubmitting}
      />
      <FormMessage message={social.errorKey ? t(social.errorKey) : null} />

      <AuthButton
        variant="link"
        label={t('auth.login.noAccount')}
        onPress={onCreateAccount}
        disabled={isSubmitting || social.isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}

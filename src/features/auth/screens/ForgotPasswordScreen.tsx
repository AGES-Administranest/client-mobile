import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { TextField } from '../components/TextField';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useForgotPassword } from '../hooks/useForgotPassword';

type ForgotPasswordScreenProps = {
  onBack: () => void;
  onSent: (email: string) => void;
};

export function ForgotPasswordScreen({
  onBack,
  onSent,
}: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
  const {
    email,
    emailError,
    notFound,
    setEmail,
    submit,
    isSubmitting,
    errorKey,
  } = useForgotPassword({ onSent });

  const emailErrorKey = fieldErrorKey(emailError);
  const error = notFound
    ? t('auth.forgot.emailNotFound')
    : emailErrorKey
    ? t(emailErrorKey)
    : undefined;

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.forgot.emailLabel')}
        placeholder={t('auth.forgot.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!isSubmitting}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />

      <AuthButton
        label={t('auth.forgot.submit')}
        onPress={submit}
        isLoading={isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}

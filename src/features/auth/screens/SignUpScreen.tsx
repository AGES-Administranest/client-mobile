import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { TextField } from '../components/TextField';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useSignUpForm } from '../hooks/useSignUpForm';

type SignUpScreenProps = {
  onBack: () => void;
  onLogin: () => void;
  onNeedsConfirmation: (email: string, password: string) => void;
};

export function SignUpScreen({
  onBack,
  onLogin,
  onNeedsConfirmation,
}: SignUpScreenProps) {
  const { t } = useTranslation();
  const { form, errors, setField, submit, isSubmitting, errorKey } =
    useSignUpForm({ onNeedsConfirmation });

  const fieldError = (field: keyof typeof errors) => {
    const key = fieldErrorKey(errors[field]);
    return key ? t(key) : undefined;
  };

  return (
    <AuthLayout
      title={t('auth.signUp.title')}
      description={t('auth.signUp.description')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.fields.name')}
        value={form.name}
        onChangeText={value => setField('name', value)}
        error={fieldError('name')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.email')}
        value={form.email}
        onChangeText={value => setField('email', value)}
        error={fieldError('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!isSubmitting}
      />
      <TextField
        label={t('auth.fields.passwordConfirmation')}
        value={form.passwordConfirmation}
        onChangeText={value => setField('passwordConfirmation', value)}
        error={fieldError('passwordConfirmation')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!isSubmitting}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />

      <AuthButton
        label={t('auth.signUp.submit')}
        onPress={submit}
        isLoading={isSubmitting}
        className="mt-2"
      />
      <AuthButton
        variant="link"
        label={t('auth.signUp.hasAccount')}
        onPress={onLogin}
        disabled={isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}

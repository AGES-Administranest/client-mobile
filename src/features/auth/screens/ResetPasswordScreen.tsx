import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { TextField } from '../components/TextField';
import { useResetPassword } from '../hooks/useResetPassword';

type ResetPasswordScreenProps = {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
  onExpired: () => void;
};

export function ResetPasswordScreen({
  email,
  onBack,
  onSuccess,
  onExpired,
}: ResetPasswordScreenProps) {
  const { t } = useTranslation();
  const reset = useResetPassword({ email, onSuccess, onExpired });

  const requirementItems = reset.requirements.map(
    ({ requirement, status }) => ({
      id: requirement,
      label: t(`auth.newPassword.requirements.${requirement}`),
      status,
    }),
  );

  let codeError: string | undefined;
  if (reset.codeMissing) {
    codeError = t('auth.validation.required');
  } else if (reset.codeInvalid) {
    codeError = t('auth.errors.invalidCode');
  }

  return (
    <AuthLayout
      title={t('auth.newPassword.title')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.newPassword.codeLabel')}
        value={reset.code}
        onChangeText={reset.changeCode}
        error={codeError}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        editable={!reset.isSubmitting}
      />

      <TextField
        label={t('auth.newPassword.passwordLabel')}
        placeholder={t('auth.newPassword.placeholder')}
        value={reset.password}
        onChangeText={reset.setPassword}
        error={undefined}
        className={reset.showRequirementsError ? 'border-button-secondary' : ''}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!reset.isSubmitting}
      />
      <PasswordRequirements
        heading={
          reset.showRequirementsError
            ? t('auth.newPassword.requirementsNotMet')
            : null
        }
        items={requirementItems}
      />

      <TextField
        label={t('auth.newPassword.confirmationLabel')}
        placeholder={t('auth.newPassword.placeholder')}
        value={reset.confirmation}
        onChangeText={reset.setConfirmation}
        error={
          reset.confirmationState === 'mismatch'
            ? t('auth.newPassword.mismatch')
            : undefined
        }
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={reset.submit}
        editable={!reset.isSubmitting}
      />
      {reset.confirmationState === 'match' ? (
        <Text className="-mt-2 mb-3 text-xs text-label-quartenery">
          {t('auth.newPassword.match')}
        </Text>
      ) : null}

      <FormMessage message={reset.errorKey ? t(reset.errorKey) : null} />

      <AuthButton
        label={t('auth.newPassword.submit')}
        onPress={reset.submit}
        isLoading={reset.isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}

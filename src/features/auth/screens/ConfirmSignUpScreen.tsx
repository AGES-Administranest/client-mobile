import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { TextField } from '../components/TextField';
import { fieldErrorKey } from '../hooks/authMessageKeys';
import { useConfirmSignUp } from '../hooks/useConfirmSignUp';

type ConfirmSignUpScreenProps = {
  email: string;
  password: string;
  resendOnMount: boolean;
  onBack: () => void;
};

export function ConfirmSignUpScreen({
  email,
  password,
  resendOnMount,
  onBack,
}: ConfirmSignUpScreenProps) {
  const { t } = useTranslation();
  const {
    code,
    codeError,
    setCode,
    submit,
    resend,
    isSubmitting,
    errorKey,
    noticeKey,
  } = useConfirmSignUp({ email, password, resendOnMount });

  const codeErrorKey = fieldErrorKey(codeError);

  return (
    <AuthLayout
      title={t('auth.confirm.title')}
      description={t('auth.confirm.description', { email })}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <TextField
        label={t('auth.fields.code')}
        value={code}
        onChangeText={setCode}
        error={codeErrorKey ? t(codeErrorKey) : undefined}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!isSubmitting}
      />

      <FormMessage message={errorKey ? t(errorKey) : null} />
      <FormMessage tone="info" message={noticeKey ? t(noticeKey) : null} />

      <AuthButton
        label={t('auth.confirm.submit')}
        onPress={submit}
        isLoading={isSubmitting}
        className="mt-2"
      />
      <AuthButton
        variant="link"
        label={t('auth.confirm.resend')}
        onPress={resend}
        disabled={isSubmitting}
        className="mt-2"
      />
    </AuthLayout>
  );
}

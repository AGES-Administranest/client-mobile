import { Mail } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { FormMessage } from '../components/FormMessage';
import { ResultIcon } from '../components/ResultIcon';
import { useResetEmailSent } from '../hooks/useResetEmailSent';

type ResetEmailSentScreenProps = {
  email: string;
  sentAt: number;
  onBack: () => void;
  onBackToLogin: () => void;
  onHaveCode: () => void;
  onResent: () => void;
};

export function ResetEmailSentScreen({
  email,
  sentAt,
  onBack,
  onBackToLogin,
  onHaveCode,
  onResent,
}: ResetEmailSentScreenProps) {
  const { t } = useTranslation();
  const { countdownLabel, canResend, resend, isSubmitting, errorKey } =
    useResetEmailSent(email, sentAt, onResent);

  return (
    <AuthLayout
      title={t('auth.emailSent.title')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <View className="w-full items-center">
        <ResultIcon icon={Mail} />
        <Text className="mt-6 text-lg font-semibold text-label-quartenery">
          {t('auth.emailSent.heading')}
        </Text>
        <Text className="mt-3 text-center text-[15px] text-label-tertiary">
          {t('auth.emailSent.description', { email })}
        </Text>
        <Text className="mb-8 mt-4 text-center text-xs text-label-tertiary">
          {t('auth.emailSent.hint')}
        </Text>

        <FormMessage message={errorKey ? t(errorKey) : null} />

        <AuthButton
          label={t('auth.emailSent.backToLogin')}
          onPress={onBackToLogin}
        />
        <AuthButton
          variant="link"
          label={
            canResend
              ? t('auth.emailSent.resend')
              : t('auth.emailSent.resendCountdown', { time: countdownLabel })
          }
          onPress={resend}
          disabled={!canResend || isSubmitting}
          isLoading={isSubmitting}
        />
        <AuthButton
          variant="link"
          label={t('auth.emailSent.haveCode')}
          onPress={onHaveCode}
          disabled={isSubmitting}
        />
      </View>
    </AuthLayout>
  );
}

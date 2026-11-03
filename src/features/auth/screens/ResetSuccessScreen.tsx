import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { ResultIcon } from '../components/ResultIcon';

type ResetSuccessScreenProps = {
  onGoToLogin: () => void;
};

// No back button, as in the Figma: "Ir para o Login" is the only way out. The
// system back (Android) goes to the login too, never back to the reset form.
export function ResetSuccessScreen({ onGoToLogin }: ResetSuccessScreenProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onGoToLogin();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onGoToLogin]);

  return (
    <AuthLayout title={t('auth.resetSuccess.title')}>
      <View className="w-full items-center">
        <ResultIcon icon={Check} />
        <Text className="mt-6 text-lg font-semibold text-label-quartenery">
          {t('auth.resetSuccess.heading')}
        </Text>
        <Text className="mb-8 mt-3 text-center text-[15px] text-label-tertiary">
          {t('auth.resetSuccess.description')}
        </Text>

        <AuthButton
          label={t('auth.resetSuccess.goToLogin')}
          onPress={onGoToLogin}
        />
      </View>
    </AuthLayout>
  );
}

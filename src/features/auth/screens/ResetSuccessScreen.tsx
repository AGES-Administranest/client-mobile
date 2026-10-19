import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { ResultIcon } from '../components/ResultIcon';

type ResetSuccessScreenProps = {
  onGoToLogin: () => void;
};

// Back leads to the login too: the reset flow must not be reachable again.
export function ResetSuccessScreen({ onGoToLogin }: ResetSuccessScreenProps) {
  const { t } = useTranslation();

  return (
    <AuthLayout
      title={t('auth.resetSuccess.title')}
      backLabel={t('auth.back')}
      onBack={onGoToLogin}
    >
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

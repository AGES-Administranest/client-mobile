import { Clock } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { AuthLayout } from '../components/AuthLayout';
import { ResultIcon } from '../components/ResultIcon';

type CodeExpiredScreenProps = {
  onBack: () => void;
  onRequestNewCode: () => void;
  onBackToLogin: () => void;
};

export function CodeExpiredScreen({
  onBack,
  onRequestNewCode,
  onBackToLogin,
}: CodeExpiredScreenProps) {
  const { t } = useTranslation();

  return (
    <AuthLayout
      title={t('auth.codeExpired.title')}
      backLabel={t('auth.back')}
      onBack={onBack}
    >
      <View className="w-full items-center">
        <ResultIcon icon={Clock} tone="error" />
        <Text className="mt-6 text-lg font-semibold text-label-quartenery">
          {t('auth.codeExpired.heading')}
        </Text>
        <Text className="mt-3 text-center text-[15px] text-label-tertiary">
          {t('auth.codeExpired.description')}
        </Text>
        <Text className="mb-8 mt-4 text-center text-[15px] text-label-tertiary">
          {t('auth.codeExpired.hint')}
        </Text>

        <AuthButton
          label={t('auth.codeExpired.requestNew')}
          onPress={onRequestNewCode}
        />
        <AuthButton
          variant="link"
          label={t('auth.codeExpired.backToLogin')}
          onPress={onBackToLogin}
        />
      </View>
    </AuthLayout>
  );
}

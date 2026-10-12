import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { PricingOnboarding } from '../components/PricingOnboarding';
import { usePricingSettings } from '../hooks/usePricingSettings';

export function PricingOnboardingSection() {
  const { t } = useTranslation();
  const { state, reload } = usePricingSettings();

  if (state.status === 'loading') {
    return (
      <View
        accessibilityLabel={t('pricing.onboarding.loading')}
        className="items-center py-6"
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View className="items-center gap-2 py-6">
        <Text className="text-center text-sm text-alert-primary">
          {t('pricing.onboarding.loadFailure')}
        </Text>
        <Pressable accessibilityRole="button" onPress={reload}>
          <Text className="text-[13px] font-semibold text-label-quartenery">
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === 'configured') {
    return null;
  }

  return <PricingOnboarding message={t('pricing.onboarding.message')} />;
}

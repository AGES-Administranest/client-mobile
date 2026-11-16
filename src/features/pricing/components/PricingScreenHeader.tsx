import { View } from 'react-native';

import { BackButton } from 'app/components/ui/back-button';
import { Text } from 'app/components/ui/text';

export type PricingScreenHeaderProps = {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
};

export function PricingScreenHeader({
  title,
  subtitle,
  backLabel,
  onBack,
}: PricingScreenHeaderProps) {
  return (
    <View className="gap-3 px-[15px] pb-2 pt-0">
      <BackButton label={backLabel} onPress={onBack} />

      <View className="px-[7px]">
        <Text
          accessibilityRole="header"
          className="text-xl font-bold leading-[30px] tracking-[-0.2px] text-label-primary"
        >
          {title}
        </Text>
        <Text className="text-[13px] leading-[19.5px] text-label-primary">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

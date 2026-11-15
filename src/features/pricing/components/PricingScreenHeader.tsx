import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
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
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={8}
        className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
      </Pressable>

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

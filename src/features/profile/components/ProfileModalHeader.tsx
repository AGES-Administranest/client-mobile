import { View } from 'react-native';

import { BackButton } from 'app/components/ui/back-button';
import { Text } from 'app/components/ui/text';

type ProfileModalHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
};

export function ProfileModalHeader({
  title,
  backLabel,
  onBack,
}: ProfileModalHeaderProps) {
  return (
    <View className="h-11 flex-row items-center gap-3 px-5">
      <BackButton label={backLabel} onPress={onBack} />
      <Text
        accessibilityRole="header"
        className="text-[26px] font-bold leading-[30px] text-label-primary"
      >
        {title}
      </Text>
    </View>
  );
}

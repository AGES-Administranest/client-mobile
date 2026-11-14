import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
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
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={8}
        className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
      </Pressable>
      <Text
        accessibilityRole="header"
        className="text-[26px] font-bold leading-[30px] text-label-primary"
      >
        {title}
      </Text>
    </View>
  );
}

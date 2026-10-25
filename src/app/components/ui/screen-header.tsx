import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type ScreenHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
};

export function ScreenHeader({ title, backLabel, onBack }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center gap-1 px-3 pb-2">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon as={ChevronLeft} className="size-7 text-label-quartenery" />
      </Pressable>
      <Text className="text-xl font-bold text-label-primary">{title}</Text>
    </View>
  );
}

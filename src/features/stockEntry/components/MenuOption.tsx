import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type MenuOptionProps = {
  icon: LucideIcon;
  title: string;
  caption: string;
  onPress: () => void;
};

export function MenuOption({ icon, title, caption, onPress }: MenuOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-button-primary">
        <Icon as={icon} size={18} className="text-label-secondary" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-bold text-label-primary">{title}</Text>
        <Text className="text-xs text-label-tertiary">{caption}</Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-label-tertiary" />
    </Pressable>
  );
}

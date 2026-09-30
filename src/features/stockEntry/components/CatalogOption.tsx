import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type CatalogOptionProps = {
  title: string;
  caption?: string;
  icon?: LucideIcon;
  onPress: () => void;
};

export function CatalogOption({
  title,
  caption,
  icon,
  onPress,
}: CatalogOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-b border-border-primary px-4 py-3 active:opacity-70"
    >
      {icon ? (
        <Icon as={icon} size={18} className="text-label-quartenery" />
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-sm text-label-primary">{title}</Text>
        {caption ? (
          <Text className="text-xs text-label-tertiary">{caption}</Text>
        ) : null}
      </View>
      <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
    </Pressable>
  );
}

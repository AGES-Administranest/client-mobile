import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ProfileMenuItemProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function ProfileMenuItem({
  label,
  icon,
  onPress,
  tone = 'default',
}: ProfileMenuItemProps) {
  const color = tone === 'danger' ? 'text-alert-primary' : 'text-label-primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-14 flex-row items-center gap-3 rounded-2xl bg-white px-4 active:opacity-70"
    >
      <Icon as={icon} size={20} className={color} />
      <Text className={cn('flex-1 text-base font-medium', color)}>{label}</Text>
      <Icon as={ChevronRight} size={18} className="text-label-tertiary" />
    </Pressable>
  );
}

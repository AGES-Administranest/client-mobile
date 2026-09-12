import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  className?: string;
};

function EmptyState({ icon, message, className }: EmptyStateProps) {
  return (
    <View
      className={cn('items-center justify-center gap-3 px-8 py-10', className)}
    >
      <Icon as={icon} size={48} className="text-label-tertiary" />
      <Text variant="muted" className="text-center">
        {message}
      </Text>
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };

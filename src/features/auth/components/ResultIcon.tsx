import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { cn } from 'app/lib/utils';

type ResultIconProps = {
  icon: LucideIcon;
  tone?: 'neutral' | 'error';
};

export function ResultIcon({ icon, tone = 'neutral' }: ResultIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        'size-24 items-center justify-center rounded-full',
        tone === 'error' ? 'bg-button-secondary/15' : 'bg-border-primary/60',
      )}
    >
      <Icon
        as={icon}
        size={40}
        className={
          tone === 'error' ? 'text-button-secondary' : 'text-label-quartenery'
        }
      />
    </View>
  );
}

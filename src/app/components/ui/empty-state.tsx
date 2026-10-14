import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const emptyStateVariants = cva('gap-3', {
  variants: {
    align: {
      center: 'items-center justify-center px-8 py-10',
      start: 'items-start',
    },
  },
  defaultVariants: {
    align: 'center',
  },
});

const emptyStateMessageVariants = cva('', {
  variants: {
    align: {
      center: 'text-center',
      start: 'text-[15px] leading-[22px] text-label-primary',
    },
  },
  defaultVariants: {
    align: 'center',
  },
});

type EmptyStateProps = VariantProps<typeof emptyStateVariants> & {
  icon?: LucideIcon;
  message: string;
  className?: string;
};

function EmptyState({ icon, message, align, className }: EmptyStateProps) {
  return (
    <View className={cn(emptyStateVariants({ align }), className)}>
      {icon ? (
        <Icon as={icon} size={48} className="text-label-tertiary" />
      ) : null}
      <Text
        variant={align === 'start' ? 'default' : 'muted'}
        className={emptyStateMessageVariants({ align })}
      >
        {message}
      </Text>
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };

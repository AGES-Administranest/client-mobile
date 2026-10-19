import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

const emptyStateVariants = cva('gap-3', {
  variants: {
    align: {
      center:
        'w-full items-center justify-center gap-2 rounded-[14px] bg-white px-6 py-8 shadow-[0px_5px_5px_rgba(0,0,0,0.1)]',
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

type EmptyStateAction = {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
};

type EmptyStateProps = VariantProps<typeof emptyStateVariants> & {
  icon?: LucideIcon;
  iconClassName?: string;
  title?: string;
  message?: string;
  messageClassName?: string;
  action?: EmptyStateAction;
  className?: string;
};

function EmptyState({
  icon,
  iconClassName,
  title,
  message,
  messageClassName,
  action,
  align,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn(emptyStateVariants({ align }), className)}>
      {icon ? (
        <Icon
          as={icon}
          size={40}
          className={cn('text-label-quartenery', iconClassName)}
        />
      ) : null}
      {title ? (
        <Text className="text-center text-[15px] font-semibold leading-[22px] text-label-primary">
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text
          variant={align === 'start' ? 'default' : 'muted'}
          className={cn(emptyStateMessageVariants({ align }), messageClassName)}
        >
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button
          shape="pill"
          size="sm"
          onPress={action.onPress}
          className="mt-2 h-8 gap-1.5 px-3.5"
        >
          {action.icon ? <Icon as={action.icon} size={14} /> : null}
          <Text className="text-xs font-semibold">{action.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export { EmptyState };
export type { EmptyStateAction, EmptyStateProps };

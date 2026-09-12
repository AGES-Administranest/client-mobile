import { cva } from 'class-variance-authority';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type MovementDirection = 'inbound' | 'outbound';

const DIRECTION_ICONS = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
} as const;

const movementIconVariants = cva(
  'size-8 items-center justify-center rounded-full',
  {
    variants: {
      direction: {
        inbound: 'bg-details-primary',
        outbound: 'bg-details-secondary',
      },
    },
    defaultVariants: {
      direction: 'inbound',
    },
  },
);

const movementValueVariants = cva('text-base font-bold', {
  variants: {
    direction: {
      inbound: 'text-label-primary',
      outbound: 'text-alert-primary',
    },
  },
  defaultVariants: {
    direction: 'inbound',
  },
});

type MovementCardProps = {
  direction: MovementDirection;
  title: string;
  subtitle: string;
  category?: string;
  value: string;
  valueCaption?: string;
  link?: string;
  onPress?: () => void;
  className?: string;
};

function MovementCard({
  direction,
  title,
  subtitle,
  category,
  value,
  valueCaption,
  link,
  onPress,
  className,
}: MovementCardProps) {
  const content = (
    <Card variant="material" className={cn('items-start', className)}>
      <View className={movementIconVariants({ direction })}>
        <Icon
          as={DIRECTION_ICONS[direction]}
          className="size-4 text-label-quartenery"
        />
      </View>
      <View className="flex-1 gap-1 px-3">
        <Text className="font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="muted" numberOfLines={1}>
            {subtitle}
          </Text>
          {category ? (
            <View className="rounded-full bg-details-primary px-2 py-0.5">
              <Text
                className="text-xs font-medium text-label-primary"
                numberOfLines={1}
              >
                {category}
              </Text>
            </View>
          ) : null}
        </View>
        {link ? (
          <Text
            variant="muted"
            className="text-xs text-label-quartenery"
            numberOfLines={1}
          >
            {link}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        <Text className={movementValueVariants({ direction })}>{value}</Text>
        {valueCaption ? (
          <Text variant="muted" className="text-xs">
            {valueCaption}
          </Text>
        ) : null}
      </View>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

export { MovementCard, movementIconVariants, movementValueVariants };
export type { MovementCardProps, MovementDirection };

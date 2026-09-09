import { ActivityIndicator, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import {
  MovementCard,
  type MovementCardProps,
} from 'app/components/ui/movement-card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type MovementListItem = { id: string } & Pick<
  MovementCardProps,
  | 'direction'
  | 'title'
  | 'subtitle'
  | 'category'
  | 'value'
  | 'valueCaption'
  | 'link'
>;

type MovementListError = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

type MovementListProps = {
  items: readonly MovementListItem[];
  isLoading: boolean;
  emptyMessage: string;
  error?: MovementListError;
  className?: string;
};

function MovementList({
  items,
  isLoading,
  emptyMessage,
  error,
  className,
}: MovementListProps) {
  if (isLoading) {
    return <ActivityIndicator className={cn('my-6', className)} />;
  }

  if (error) {
    return (
      <View className={cn('items-center gap-3 py-6', className)}>
        <Text variant="muted" className="text-center">
          {error.message}
        </Text>
        <Button shape="pill" onPress={error.onRetry}>
          <Text>{error.retryLabel}</Text>
        </Button>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <Text variant="muted" className={cn('py-6 text-center', className)}>
        {emptyMessage}
      </Text>
    );
  }

  return (
    <View className={cn('gap-3', className)}>
      {items.map(item => (
        <MovementCard
          key={item.id}
          direction={item.direction}
          title={item.title}
          subtitle={item.subtitle}
          category={item.category}
          value={item.value}
          valueCaption={item.valueCaption}
          link={item.link}
        />
      ))}
    </View>
  );
}

export { MovementList };
export type { MovementListError, MovementListItem, MovementListProps };

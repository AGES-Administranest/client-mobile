import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type DeletionSuccessCardProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function DeletionSuccessCard({
  title,
  message,
  actionLabel,
  onAction,
}: DeletionSuccessCardProps) {
  return (
    <View className="items-center gap-3 rounded-3xl bg-white px-6 py-8">
      <View className="size-12 items-center justify-center rounded-full bg-details-finish">
        <Icon as={Check} size={24} className="text-trend-up" />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-1 text-center text-xl font-semibold text-label-primary"
      >
        {title}
      </Text>
      <Text className="text-center text-sm leading-5 text-label-muted">
        {message}
      </Text>
      <Button
        shape="pill"
        onPress={onAction}
        accessibilityLabel={actionLabel}
        className="mt-3 h-14 w-full bg-button-primary active:opacity-80"
      >
        <Text className="font-medium text-label-secondary">{actionLabel}</Text>
      </Button>
    </View>
  );
}

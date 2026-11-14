import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type LegalDocumentCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function LegalDocumentCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: LegalDocumentCardProps) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-5 shadow-md shadow-black/10">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-full bg-details-warm">
          <Icon as={icon} size={20} className="text-label-quartenery" />
        </View>
        <Text
          accessibilityRole="header"
          className="flex-1 text-lg font-semibold text-label-primary"
        >
          {title}
        </Text>
      </View>
      <Text className="text-sm leading-5 text-label-muted">{description}</Text>
      <Button
        shape="pill"
        onPress={onAction}
        accessibilityLabel={actionLabel}
        className="h-12 w-full bg-button-primary active:opacity-80"
      >
        <Text className="font-medium text-label-secondary">{actionLabel}</Text>
      </Button>
    </View>
  );
}

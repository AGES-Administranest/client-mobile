import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';

type InvoiceListFooterProps = {
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
};

export function InvoiceListFooter({
  isLoadingMore,
  loadMoreFailed,
  loadingLabel,
  errorLabel,
  retryLabel,
  onRetry,
}: InvoiceListFooterProps) {
  if (isLoadingMore) {
    return (
      <View accessibilityLabel={loadingLabel} className="items-center py-4">
        <ActivityIndicator />
      </View>
    );
  }

  if (loadMoreFailed) {
    return (
      <View className="items-center gap-2 py-4">
        <Text className="text-xs text-label-tertiary">{errorLabel}</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={6}>
          <Text className="text-xs font-semibold text-label-quartenery">
            {retryLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

import { CloudCheck, CloudOff, RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type SaveStatusBarProps = {
  label: string;
  isSaving: boolean;
  hasFailed: boolean;
  retryLabel: string;
  onRetry: () => void;
};

export function SaveStatusBar({
  label,
  isSaving,
  hasFailed,
  retryLabel,
  onRetry,
}: SaveStatusBarProps) {
  const icon = hasFailed ? CloudOff : isSaving ? RefreshCw : CloudCheck;

  return (
    <View className="flex-row items-center gap-1.5 px-4 pb-2">
      <Icon
        as={icon}
        size={14}
        className={hasFailed ? 'text-alert-primary' : 'text-label-tertiary'}
      />
      <Text
        className={cn(
          'text-xs',
          hasFailed ? 'text-alert-primary' : 'text-label-tertiary',
        )}
      >
        {label}
      </Text>
      {hasFailed ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text className="text-xs font-semibold text-label-quartenery underline">
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

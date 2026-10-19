import { Info, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type NoticeTone = 'alert' | 'warning' | 'info';

const TONES: Record<NoticeTone, { box: string; text: string }> = {
  alert: {
    box: 'border border-alert-primary bg-white',
    text: 'text-alert-primary',
  },
  warning: { box: 'bg-details-tertiary', text: 'text-label-primary' },
  info: { box: 'bg-details-primary', text: 'text-label-primary' },
};

type NoticeBannerProps = {
  tone: NoticeTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function NoticeBanner({
  tone,
  message,
  actionLabel,
  onAction,
}: NoticeBannerProps) {
  const colors = TONES[tone];

  return (
    <View className="gap-2">
      <View
        className={cn('flex-row items-start gap-2 rounded-lg p-3', colors.box)}
      >
        <Icon
          as={tone === 'info' ? Info : TriangleAlert}
          size={16}
          className={colors.text}
        />
        <Text className={cn('flex-1 text-xs leading-4', colors.text)}>
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          className="items-center rounded-full bg-button-primary py-2.5"
        >
          <Text className="text-xs font-medium text-label-secondary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

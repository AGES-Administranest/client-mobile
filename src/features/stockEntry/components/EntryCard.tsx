import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type StatusTone = 'attention' | 'neutral' | 'alert' | 'muted';

export type EntryAction = {
  label: string;
  onPress: () => void;
  emphasis?: boolean;
};

type EntryCardProps = {
  title: string;
  meta: string;
  value?: string;
  statusLabel: string;
  statusTone: StatusTone;
  reason?: string;
  actions: EntryAction[];
  onPress?: () => void;
};

const BADGE: Record<StatusTone, string> = {
  attention: 'bg-details-tertiary',
  neutral: 'bg-details-primary',
  alert: 'border border-alert-primary bg-white',
  muted: 'border border-border-primary bg-white',
};

const BADGE_TEXT: Record<StatusTone, string> = {
  attention: 'text-label-primary',
  neutral: 'text-label-quartenery',
  alert: 'text-alert-primary',
  muted: 'text-label-tertiary',
};

export function EntryCard({
  title,
  meta,
  value,
  statusLabel,
  statusTone,
  reason,
  actions,
  onPress,
}: EntryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={cn(
        'gap-3 rounded-2xl bg-white p-4',
        statusTone === 'alert' && 'border border-alert-primary',
      )}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <Text
            className="text-sm font-bold text-label-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-xs text-label-tertiary">{meta}</Text>
        </View>
        {value ? (
          <Text className="text-sm font-bold text-label-primary">{value}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <View className={cn('rounded-full px-2 py-0.5', BADGE[statusTone])}>
          <Text
            className={cn('text-[11px] font-medium', BADGE_TEXT[statusTone])}
          >
            {statusLabel}
          </Text>
        </View>
        <View className="flex-1" />
        {onPress ? (
          <Icon as={ChevronRight} size={16} className="text-label-tertiary" />
        ) : null}
      </View>

      {reason ? (
        <Text
          className={cn(
            'text-xs',
            statusTone === 'alert'
              ? 'text-alert-primary'
              : 'text-label-tertiary',
          )}
        >
          {reason}
        </Text>
      ) : null}

      {actions.length > 0 ? (
        <View className="flex-row flex-wrap gap-4">
          {actions.map(action => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text
                className={cn(
                  'text-xs font-semibold',
                  action.emphasis
                    ? 'text-label-quartenery'
                    : 'text-label-tertiary',
                )}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

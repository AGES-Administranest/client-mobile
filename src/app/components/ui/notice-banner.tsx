import {
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type NoticeTone = 'alert' | 'warning' | 'info' | 'success';

const TONES: Record<
  NoticeTone,
  { box: string; text: string; icon: LucideIcon }
> = {
  alert: {
    box: 'border border-alert-primary bg-white',
    text: 'text-alert-primary',
    icon: TriangleAlert,
  },
  warning: {
    box: 'bg-details-tertiary',
    text: 'text-label-primary',
    icon: TriangleAlert,
  },
  info: { box: 'bg-details-primary', text: 'text-label-primary', icon: Info },
  success: {
    box: 'bg-details-finish',
    text: 'text-label-primary',
    icon: CircleCheck,
  },
};

type NoticeBannerProps = {
  tone: NoticeTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * 'below' (padrão) é o botão largo sob o aviso; 'inline' é a pílula pequena
   * à direita, dentro do aviso, como o "Tentar novamente" do resumo financeiro.
   */
  actionPlacement?: 'below' | 'inline';
  actionIcon?: LucideIcon;
};

export function NoticeBanner({
  tone,
  message,
  actionLabel,
  onAction,
  actionPlacement = 'below',
  actionIcon,
}: NoticeBannerProps) {
  const colors = TONES[tone];
  const hasAction = Boolean(actionLabel && onAction);
  const isInline = hasAction && actionPlacement === 'inline';

  return (
    <View className="gap-2">
      <View
        className={cn(
          'flex-row gap-2 rounded-lg p-3',
          isInline ? 'items-center' : 'items-start',
          colors.box,
        )}
      >
        <Icon as={colors.icon} size={16} className={colors.text} />
        <Text className={cn('flex-1 text-xs leading-4', colors.text)}>
          {message}
        </Text>
        {isInline ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full bg-button-primary px-3 py-2"
          >
            {actionIcon ? (
              <Icon
                as={actionIcon}
                size={14}
                className="text-label-secondary"
              />
            ) : null}
            <Text className="text-xs font-semibold text-label-secondary">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {hasAction && !isInline ? (
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

import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { AppointmentActionNotice } from '../domain/toCompletionOutcome';

export type AppointmentActionsTexts = {
  complete: string;
  notices: Record<AppointmentActionNotice, string>;
};

type AppointmentActionsProps = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  texts: AppointmentActionsTexts;
  onComplete: () => void;
  className?: string;
};

export function AppointmentActions({
  visible,
  submitting,
  notice,
  texts,
  onComplete,
  className,
}: AppointmentActionsProps) {
  if (!visible) {
    return null;
  }

  if (notice === 'CANCELED') {
    return (
      <View className={className}>
        <Text className="text-sm text-label-primary">
          {texts.notices.CANCELED}
        </Text>
      </View>
    );
  }

  return (
    <View className={cn('gap-2', className)}>
      <Button
        shape="pill"
        icon={Check}
        className="h-[49px] w-full"
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={texts.complete}
        accessibilityState={{ disabled: submitting, busy: submitting }}
        onPress={onComplete}
      >
        <Text className="font-semibold">{texts.complete}</Text>
      </Button>
      {notice ? (
        <Text className="text-sm text-alert-primary">
          {texts.notices[notice]}
        </Text>
      ) : null}
    </View>
  );
}

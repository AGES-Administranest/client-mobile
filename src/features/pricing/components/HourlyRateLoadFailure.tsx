import { RotateCw } from 'lucide-react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type HourlyRateLoadFailureProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

// The card the history and the month detail show when a call fails: the
// message and a pill to try again.
export function HourlyRateLoadFailure({
  message,
  retryLabel,
  onRetry,
}: HourlyRateLoadFailureProps) {
  return (
    <Card
      role="alert"
      accessibilityLiveRegion="polite"
      className="items-center gap-3 rounded-[14px] px-6 py-8"
    >
      <Text className="text-center text-[13px] leading-[19.5px] text-label-placeholder">
        {message}
      </Text>
      <Button
        shape="pill"
        size="sm"
        hitSlop={6}
        onPress={onRetry}
        className="h-8 gap-1.5 px-3.5"
      >
        <Icon as={RotateCw} size={14} />
        <Text className="text-xs font-semibold">{retryLabel}</Text>
      </Button>
    </Card>
  );
}

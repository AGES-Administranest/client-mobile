import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

export type TrendTone = 'up' | 'down' | 'flat';

export type TrendChipProps = {
  tone: TrendTone;
  label: string;
  // The arrow of a rise or a fall; the chip of the evolution card goes without.
  showIcon?: boolean;
};

export function TrendChip({ tone, label, showIcon = true }: TrendChipProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-[20px] px-2 py-[3px]',
        tone === 'up' ? 'bg-trend-up-fill' : 'bg-details-warm',
      )}
    >
      {tone === 'flat' || !showIcon ? null : (
        <Icon
          as={tone === 'up' ? ArrowUpRight : ArrowDownRight}
          size={11}
          className={tone === 'up' ? 'text-trend-up' : 'text-trend-down'}
        />
      )}
      <Text
        className={cn(
          'text-[10px] font-semibold leading-[15px]',
          tone === 'up' && 'text-trend-up',
          tone === 'down' && 'text-trend-down',
          tone === 'flat' && 'text-label-muted',
        )}
      >
        {label}
      </Text>
    </View>
  );
}

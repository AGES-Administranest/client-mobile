import { ChartLine } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type HourlyRateChartPlaceholderProps = {
  title: string;
  heading: string;
  message: string;
};

export function HourlyRateChartPlaceholder({
  title,
  heading,
  message,
}: HourlyRateChartPlaceholderProps) {
  return (
    <Card className="gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
      <Text className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-label-primary">
        {title}
      </Text>
      <View className="items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-border-warm px-4 py-5">
        <View className="size-14 items-center justify-center rounded-full bg-details-warm">
          <Icon as={ChartLine} size={26} className="text-label-quartenery" />
        </View>
        <Text className="text-center text-[15px] font-semibold leading-[22px] text-label-primary">
          {heading}
        </Text>
        <Text className="text-center text-xs leading-[18px] text-label-body">
          {message}
        </Text>
      </View>
    </Card>
  );
}

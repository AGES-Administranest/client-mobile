import { Info } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type HourlyRateNoteProps = {
  message: string;
};

export function HourlyRateNote({ message }: HourlyRateNoteProps) {
  return (
    <View className="flex-row items-start gap-2 rounded-[10px] bg-details-warm px-3 py-2.5">
      <Icon as={Info} size={14} className="mt-px text-label-quartenery" />
      <Text className="flex-1 text-[11px] leading-[16.5px] text-label-body">
        {message}
      </Text>
    </View>
  );
}

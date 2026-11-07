import { Paperclip } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type RecentInvoiceCardProps = {
  taker: string;
  date: string;
  /** Present only when the original file is available. */
  originalFileLabel?: string;
  onPress: () => void;
};

export function RecentInvoiceCard({
  taker,
  date,
  originalFileLabel,
  onPress,
}: RecentInvoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="w-[141px] gap-1 rounded-2xl bg-white p-4 shadow-md shadow-black/10"
    >
      <Text className="text-lg font-semibold" numberOfLines={1}>
        {taker}
      </Text>
      <Text className="text-[15px] text-label-primary">{date}</Text>
      {originalFileLabel ? (
        <View className="flex-row items-center gap-1 pt-2">
          <Icon as={Paperclip} size={13} />
          <Text
            className="flex-1 text-xs text-label-tertiary"
            numberOfLines={1}
          >
            {originalFileLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

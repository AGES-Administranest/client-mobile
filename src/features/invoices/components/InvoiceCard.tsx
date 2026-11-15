import { MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type InvoiceCardProps = {
  issuer: string;
  date: string;
  location: string;
  onPress: () => void;
  className?: string;
};

export function InvoiceCard({
  issuer,
  date,
  location,
  onPress,
  className,
}: InvoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${issuer}, ${date}, ${location}`}
      className={cn(
        'rounded-[14px] bg-white p-4 shadow-md shadow-black/10',
        className,
      )}
    >
      <Text
        className="text-[15px] font-semibold text-label-primary"
        numberOfLines={1}
      >
        {issuer}
      </Text>
      <Text className="text-xs font-light text-label-primary">{date}</Text>
      <View className="h-[26px] flex-row items-center gap-1">
        <Icon as={MapPin} size={11} className="text-label-tertiary" />
        <Text className="text-xs text-label-tertiary" numberOfLines={1}>
          {location}
        </Text>
      </View>
    </Pressable>
  );
}

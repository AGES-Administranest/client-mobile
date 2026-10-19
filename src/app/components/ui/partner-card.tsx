import { ChevronRight, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type PartnerCardProps = {
  name: string;
  location?: string;
  onPress?: () => void;
  className?: string;
};

function PartnerCard({ name, location, onPress, className }: PartnerCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className={cn('gap-0 rounded-[14px]', className)}>
        <View className="flex-row items-center justify-between gap-3">
          <Text
            className="flex-1 text-[15px] leading-[22.5px]"
            numberOfLines={1}
          >
            {name}
          </Text>
          <Icon as={ChevronRight} size={16} />
        </View>
        {location ? (
          <View className="flex-row items-center gap-1 pt-2">
            <Icon as={MapPin} size={11} />
            <Text className="flex-1 text-xs leading-[18px]" numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export { PartnerCard };
export type { PartnerCardProps };

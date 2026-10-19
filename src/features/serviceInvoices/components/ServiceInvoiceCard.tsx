import { Paperclip } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ServiceInvoiceCardProps = {
  clientName: string;
  issueDate: string;
  /** Present only when the original file is available. */
  originalFileLabel?: string;
  onPress?: () => void;
  className?: string;
};

export function ServiceInvoiceCard({
  clientName,
  issueDate,
  originalFileLabel,
  onPress,
  className,
}: ServiceInvoiceCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View
        className={cn(
          'w-[190px] gap-1 rounded-2xl bg-white p-4 shadow-md shadow-black/10',
          className,
        )}
      >
        <Text className="text-lg font-semibold" numberOfLines={1}>
          {clientName}
        </Text>
        <Text className="text-[15px] text-label-primary">{issueDate}</Text>
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
      </View>
    </Pressable>
  );
}

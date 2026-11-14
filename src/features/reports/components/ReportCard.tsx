import { CalendarDays, CircleCheck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportCardProps = {
  kind: string;
  period: string;
  generatedAt: string;
  fileName: string;
  downloadedLabel: string | null;
  onPress: () => void;
  className?: string;
};

export function ReportCard({
  kind,
  period,
  generatedAt,
  fileName,
  downloadedLabel,
  onPress,
  className,
}: ReportCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[kind, period, generatedAt, downloadedLabel]
        .filter(Boolean)
        .join(', ')}
      className={cn(
        'gap-1.5 rounded-[14px] bg-white p-4 shadow-md shadow-black/10',
        className,
      )}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className="shrink text-[15px] font-semibold text-label-primary"
          numberOfLines={1}
        >
          {kind}
        </Text>
        {downloadedLabel ? (
          <View className="flex-row items-center gap-1">
            <Icon as={CircleCheck} size={12} className="text-label-tertiary" />
            <Text className="text-[10px] text-label-tertiary">
              {downloadedLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1">
        <Icon as={CalendarDays} size={11} className="text-label-primary" />
        <Text className="text-xs text-label-primary" numberOfLines={1}>
          {period}
        </Text>
      </View>
      <Text className="text-xs font-light text-label-primary">
        {generatedAt}
      </Text>
      <Text className="text-xs text-label-tertiary" numberOfLines={1}>
        {fileName}
      </Text>
    </Pressable>
  );
}

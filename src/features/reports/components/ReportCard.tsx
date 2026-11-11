import { Pressable } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportCardProps = {
  date: string;
  fileName: string;
  className?: string;
  onPress?: () => void;
};

export function ReportCard({
  date,
  fileName,
  className,
  onPress,
}: ReportCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fileName}
      onPress={onPress}
      className={cn(
        'w-[215px] gap-3 rounded-[9px] bg-white p-[10px] shadow-md shadow-black/10',
        className,
      )}
    >
      <Text className="text-[10px] text-label-primary">{date}</Text>
      <Text className="text-sm text-label-primary" numberOfLines={2}>
        {fileName}
      </Text>
    </Pressable>
  );
}

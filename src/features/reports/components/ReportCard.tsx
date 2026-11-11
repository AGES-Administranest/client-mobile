import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type ReportCardProps = {
  date: string;
  fileName: string;
  className?: string;
};

export function ReportCard({ date, fileName, className }: ReportCardProps) {
  return (
    <View
      className={cn(
        'w-[215px] gap-3 rounded-[9px] bg-white p-[10px] shadow-md shadow-black/10',
        className,
      )}
    >
      <Text className="text-[10px] text-label-primary">{date}</Text>
      <Text className="text-sm text-label-primary" numberOfLines={2}>
        {fileName}
      </Text>
    </View>
  );
}

import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type ReportCardProps = {
  date: string;
  fileName: string;
};

export function ReportCard({ date, fileName }: ReportCardProps) {
  return (
    <View className="w-[215px] gap-3 rounded-[9px] bg-white p-[10px] shadow-md shadow-black/10">
      <Text className="text-[10px] text-label-primary">{date}</Text>
      <Text className="text-sm text-label-primary" numberOfLines={2}>
        {fileName}
      </Text>
    </View>
  );
}

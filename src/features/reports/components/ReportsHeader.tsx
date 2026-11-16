import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type ReportsHeaderProps = {
  title: string;
};

export function ReportsHeader({ title }: ReportsHeaderProps) {
  return (
    <View className="px-4 pb-2 pt-3">
      <Text
        accessibilityRole="header"
        className="text-[40px] font-medium leading-[48px] text-label-primary"
      >
        {title}
      </Text>
    </View>
  );
}

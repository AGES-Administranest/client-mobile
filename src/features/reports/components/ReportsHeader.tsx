import { FileText } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from 'app/components/ui/text';

type ReportsHeaderProps = {
  title: string;
  invoicesLabel: string;
  onInvoicesPress: () => void;
};

export function ReportsHeader({
  title,
  invoicesLabel,
  onInvoicesPress,
}: ReportsHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
      <Text
        accessibilityRole="header"
        className="text-[40px] font-medium leading-[48px] text-label-primary"
      >
        {title}
      </Text>
      <Pressable
        onPress={onInvoicesPress}
        accessibilityRole="button"
        accessibilityLabel={invoicesLabel}
        hitSlop={8}
        className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <FileText size={18} color="white" />
      </Pressable>
    </View>
  );
}

import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

export type ModalHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
};

export function ModalHeader({ title, backLabel, onBack }: ModalHeaderProps) {
  return (
    <View className="h-11 flex-row items-center justify-center px-4">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        className="absolute left-4 size-9 items-center justify-center rounded-full bg-primary"
      >
        <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
      </Pressable>
      <Text
        accessibilityRole="header"
        className="text-[13px] font-semibold uppercase tracking-wide text-label-primary"
      >
        {title}
      </Text>
    </View>
  );
}

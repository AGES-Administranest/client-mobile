import { View } from 'react-native';

import { BackButton } from 'app/components/ui/back-button';
import { Text } from 'app/components/ui/text';

export type ModalHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
};

export function ModalHeader({ title, backLabel, onBack }: ModalHeaderProps) {
  return (
    <View className="h-11 flex-row items-center justify-center px-4">
      <BackButton
        label={backLabel}
        onPress={onBack}
        className="absolute left-4"
      />
      <Text
        accessibilityRole="header"
        className="text-[13px] font-semibold uppercase tracking-wide text-label-primary"
      >
        {title}
      </Text>
    </View>
  );
}

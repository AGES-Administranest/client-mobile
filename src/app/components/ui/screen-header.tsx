import { View } from 'react-native';

import { BackButton } from 'app/components/ui/back-button';
import { Text } from 'app/components/ui/text';

type ScreenHeaderProps = {
  title: string;
  backLabel: string;
  onBack: () => void;
};

export function ScreenHeader({ title, backLabel, onBack }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 px-4 pb-2">
      <BackButton label={backLabel} onPress={onBack} />
      <Text className="text-xl font-bold text-label-primary">{title}</Text>
    </View>
  );
}

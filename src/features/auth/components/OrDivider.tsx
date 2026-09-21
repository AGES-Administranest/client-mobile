import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type OrDividerProps = {
  label: string;
};

export function OrDivider({ label }: OrDividerProps) {
  return (
    <View className="my-2.5 w-full flex-row items-center px-1">
      <View className="h-px flex-1 bg-border-primary" />
      <Text className="mx-3.5 text-sm text-label-quartenery">{label}</Text>
      <View className="h-px flex-1 bg-border-primary" />
    </View>
  );
}

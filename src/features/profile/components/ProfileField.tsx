import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type ProfileFieldProps = {
  label: string;
  value: string;
};

// Not FormField: read-only there is a muted box, the Profile screen in Figma
// keeps the white one.
export function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} className="py-1">
      <Text className="pb-1.5 text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
        {label}
      </Text>
      <View className="min-h-10 justify-center rounded-lg border border-border-primary bg-white px-4 py-2.5">
        <Text className="text-sm text-label-tertiary">{value}</Text>
      </View>
    </View>
  );
}

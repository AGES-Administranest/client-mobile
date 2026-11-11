import { View } from 'react-native';

import { Text } from 'app/components/ui/text';

type ProfileAvatarProps = {
  initials: string;
};

export function ProfileAvatar({ initials }: ProfileAvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="size-[131px] items-center justify-center self-center rounded-full bg-button-primary"
    >
      <Text className="text-[64px] font-semibold leading-[72px] text-label-secondary">
        {initials}
      </Text>
    </View>
  );
}

import { ActivityIndicator, Modal, Text, View } from 'react-native';

import { BackgroundShade, ButtonPrimary } from 'theme/colors';

type LoadingOverlayProps = {
  visible: boolean;
  label: string;
};

// Native loading shown between the scan and review screens. Uses the platform
// ActivityIndicator for now, per the design brief.
export function LoadingOverlay({ visible, label }: LoadingOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: BackgroundShade }}
      >
        <View className="items-center gap-3 rounded-2xl bg-background-modal px-8 py-6">
          <ActivityIndicator size="large" color={ButtonPrimary} />
          <Text className="text-sm font-medium text-label-primary">
            {label}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

import { Modal, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Text } from 'app/components/ui/text';
import { BackgroundShade } from 'theme/colors';

type MessageOverlayProps = {
  visible: boolean;
  message: string;
  actionLabel: string;
  onDismiss: () => void;
};

export function MessageOverlay({
  visible,
  message,
  actionLabel,
  onDismiss,
}: MessageOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: BackgroundShade }}
      >
        <View className="w-full gap-4 rounded-2xl bg-background-modal px-6 py-6">
          <Text className="text-center text-sm text-label-primary">
            {message}
          </Text>
          <ActionButton label={actionLabel} onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

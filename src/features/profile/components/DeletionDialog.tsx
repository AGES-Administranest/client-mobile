import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Modal, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { BackgroundShade, ButtonPrimary } from 'theme/colors';

type DeletionDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onRequestClose: () => void;
};

export function DeletionDialog({
  visible,
  title,
  message,
  icon,
  isLoading = false,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRequestClose,
}: DeletionDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: BackgroundShade }}
      >
        <View
          accessibilityViewIsModal
          className="w-full max-w-[400px] items-center gap-3 rounded-3xl bg-background-modal px-6 py-8"
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={ButtonPrimary} />
          ) : icon ? (
            <Icon as={icon} size={36} className="text-label-quartenery" />
          ) : (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="size-12 items-center justify-center rounded-full bg-alert-primary"
            >
              <Text className="text-2xl font-bold text-label-secondary">!</Text>
            </View>
          )}
          <Text
            accessibilityRole="header"
            className="mt-1 text-center text-xl font-semibold text-label-primary"
          >
            {title}
          </Text>
          <Text className="text-center text-sm leading-5 text-label-muted">
            {message}
          </Text>
          {primaryLabel ? (
            <Button
              shape="pill"
              onPress={onPrimary}
              accessibilityLabel={primaryLabel}
              className="mt-3 h-14 w-full bg-button-primary active:opacity-80"
            >
              <Text className="font-medium text-label-secondary">
                {primaryLabel}
              </Text>
            </Button>
          ) : null}
          {secondaryLabel ? (
            <Button
              variant="link"
              onPress={onSecondary}
              accessibilityLabel={secondaryLabel}
              className="h-11"
            >
              <Text className="font-medium text-label-quartenery">
                {secondaryLabel}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

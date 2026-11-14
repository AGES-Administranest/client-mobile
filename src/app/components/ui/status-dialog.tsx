import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { Colors } from 'theme/colors';

const MAX_WIDTH = 400;
const INITIAL_SCALE = 0.98;
const BADGE_SIZE = 48;

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: MAX_WIDTH },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
  },
});

type StatusDialogTone = 'danger' | 'success';

const BADGE_COLORS: Record<StatusDialogTone, string> = {
  danger: Colors.alert.soft,
  success: Colors.details.finish,
};

type StatusDialogAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type StatusDialogProps = {
  visible: boolean;
  tone: StatusDialogTone;
  icon: LucideIcon;
  title: string;
  message?: string;
  children?: ReactNode;
  primary: StatusDialogAction;
  secondary?: StatusDialogAction;
  onRequestClose: () => void;
};

function StatusDialog({
  visible,
  tone,
  icon,
  title,
  message,
  children,
  primary,
  secondary,
  onRequestClose,
}: StatusDialogProps) {
  const { isRendered, progress } = useSheetAnimation(visible);
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [INITIAL_SCALE, 1],
  });
  const hasSecondary = secondary !== undefined;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
      aria-label={title}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          onPress={onRequestClose}
          className="flex-1 items-center justify-center bg-background-shade px-6"
        >
          <Animated.View
            accessibilityViewIsModal
            style={[styles.card, { transform: [{ scale }] }]}
          >
            <Pressable
              role="alertdialog"
              className="items-center gap-4 rounded-2xl bg-white p-5 shadow-[0px_12px_24px_-10px_rgba(0,0,0,0.16)]"
              onPress={event => event.stopPropagation()}
            >
              <View
                className="items-center justify-center"
                style={[styles.badge, { backgroundColor: BADGE_COLORS[tone] }]}
              >
                <Icon
                  as={icon}
                  size={22}
                  className={
                    tone === 'danger'
                      ? 'text-button-secondary'
                      : 'text-label-quartenery'
                  }
                />
              </View>

              <View className="items-center gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-center text-xl font-bold text-label-primary"
                >
                  {title}
                </Text>
                {message ? (
                  <Text className="text-center text-[14px] leading-5 text-label-tertiary">
                    {message}
                  </Text>
                ) : null}
              </View>

              {children ? <View className="w-full">{children}</View> : null}

              <View className="w-full gap-2 pt-1">
                <Button
                  shape="pill"
                  variant={tone === 'danger' ? 'destructive' : 'outline'}
                  disabled={primary.disabled}
                  className="h-[46px] w-full"
                  onPress={primary.onPress}
                >
                  <Text className="font-semibold">{primary.label}</Text>
                </Button>
                {hasSecondary ? (
                  <Button
                    shape="pill"
                    variant="outline"
                    disabled={secondary.disabled}
                    className="h-[46px] w-full"
                    onPress={secondary.onPress}
                  >
                    <Text className="font-semibold">{secondary.label}</Text>
                  </Button>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export { StatusDialog };
export type { StatusDialogAction, StatusDialogProps, StatusDialogTone };

import type { ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

const MAX_WIDTH = 400;
const INITIAL_SCALE = 0.98;

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: MAX_WIDTH },
});

type StatusDialogTone = 'danger' | 'success';

type StatusDialogAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type StatusDialogProps = {
  visible: boolean;
  tone: StatusDialogTone;
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
                  disabled={primary.disabled}
                  className={cn(
                    'h-[46px] w-full',
                    tone === 'danger' &&
                      'bg-button-secondary active:bg-button-secondary/90',
                  )}
                  onPress={primary.onPress}
                >
                  <Text className="font-semibold">{primary.label}</Text>
                </Button>
                {hasSecondary ? (
                  <Button
                    shape="pill"
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

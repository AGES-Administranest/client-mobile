import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmação de ação destrutiva.
 *
 * Existe porque `Alert.alert` do react-native-web é um no-op (`static alert() {}`):
 * na web o diálogo nunca aparecia e o callback de confirmação nunca rodava, então
 * a ação simplesmente não acontecia. Este bottom sheet funciona nas três
 * plataformas e segue o padrão de sheet do DESIGN.md.
 */
function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, overlayOpacity, sheetTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={{ flex: 1, opacity: overlayOpacity }}>
        <Pressable
          className="flex-1 justify-end bg-background-shade"
          onPress={onCancel}
        >
          <Animated.View
            style={{ transform: [{ translateY: sheetTranslateY }] }}
          >
            <Pressable
              className="gap-4 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4"
              onPress={e => e.stopPropagation()}
            >
              <View className="mb-2 h-1 w-10 self-center rounded-full bg-details-primary" />

              <Text className="text-xl font-bold text-label-primary">
                {title}
              </Text>
              <Text className="text-[15px] text-label-tertiary">{message}</Text>

              <Button
                variant="secondary"
                shape="pill"
                className="h-[49px] w-full"
                onPress={onConfirm}
              >
                <Text className="font-semibold">{confirmLabel}</Text>
              </Button>
              <Button
                variant="outline"
                shape="pill"
                className="h-[49px] w-full"
                onPress={onCancel}
              >
                <Text className="font-semibold">{cancelLabel}</Text>
              </Button>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export { ConfirmSheet };
export type { ConfirmSheetProps };

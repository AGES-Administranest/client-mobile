import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks';
import { BackgroundShade } from 'theme/colors';

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
 *
 * O layout vem só de `style` nos `Animated.View`: o NativeWind não aplica
 * `className` em componentes animados, e um `className="flex-1"` ali deixava o
 * véu sem altura — a folha subia para o topo da tela e o fundo não escurecia.
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
  const { isRendered, progress, translateY } = useSheetAnimation(visible);

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BackgroundShade, opacity: progress },
          ]}
        />

        <Pressable className="flex-1" onPress={onCancel} />

        <Animated.View style={{ transform: [{ translateY }] }}>
          <View className="gap-4 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4">
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-details-primary" />

            <Text className="text-xl font-bold text-label-primary">
              {title}
            </Text>
            <Text className="text-[15px] text-label-primary">{message}</Text>

            <Button
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
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export { ConfirmSheet };
export type { ConfirmSheetProps };

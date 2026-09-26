import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks';
import { BackgroundShade } from 'theme/colors';

const MAX_WIDTH = 400;
const INITIAL_SCALE = 0.95;

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: MAX_WIDTH },
});

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Sem ele, o diálogo só tem a ação principal (um aviso). */
  cancelLabel?: string;
  onConfirm: () => void;
  /** Tocar fora e o voltar do Android — e o botão secundário, se houver. */
  onCancel: () => void;
};

/**
 * Confirmação em diálogo centralizado.
 *
 * É a confirmação para quando já há uma folha aberta (descartar o formulário
 * de agendamento, por exemplo): uma segunda folha subindo por cima da primeira
 * confunde qual das duas está em foco. Fora desse caso, `ConfirmSheet` segue
 * sendo o padrão. Mesmas props, então trocar um pelo outro é trocar o import.
 *
 * Usa `useSheetAnimation` só pelo `isRendered` e pelo `progress` — o véu e o
 * cartão esmaecem juntos, e o Modal só desmonta depois da saída; o
 * `translateY` do hook não se aplica aqui.
 */
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { isRendered, progress } = useSheetAnimation(visible);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [INITIAL_SCALE, 1],
  });

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BackgroundShade, opacity: progress },
          ]}
        />

        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel={cancelLabel ?? confirmLabel}
          onPress={onCancel}
        />

        <Animated.View
          accessibilityViewIsModal
          style={[styles.card, { opacity: progress, transform: [{ scale }] }]}
        >
          <View className="gap-4 rounded-2xl bg-background-modal p-5 shadow-md shadow-black/10">
            <Text className="text-lg font-bold text-label-primary">
              {title}
            </Text>
            <Text className="text-[15px] text-label-primary">{message}</Text>

            <View className="mt-1 gap-3">
              <Button
                shape="pill"
                className="h-[49px] w-full"
                onPress={onConfirm}
              >
                <Text className="font-semibold">{confirmLabel}</Text>
              </Button>
              {cancelLabel ? (
                <Button
                  variant="outline"
                  shape="pill"
                  className="h-[49px] w-full"
                  onPress={onCancel}
                >
                  <Text className="font-semibold">{cancelLabel}</Text>
                </Button>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };

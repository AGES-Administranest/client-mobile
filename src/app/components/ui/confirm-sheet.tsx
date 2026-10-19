import { Check, type LucideIcon, X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  /**
   * Sem ele, só o confirmar aparece: avisos com uma única saída. Tocar fora
   * ou arrastar para baixo continua chamando `onCancel`.
   */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Ícone do confirmar: ✓ por padrão; exclusões passam a lixeira. */
  confirmIcon?: LucideIcon;
  /**
   * 'danger' (padrão) pinta o cancelar do vermelho da paleta (button-secondary). 'button' usa o marrom do
   * confirmar, para perguntas sem risco em que as duas respostas pesam igual.
   */
  cancelAppearance?: 'danger' | 'button';
  /**
   * Chamado quando o sheet terminou de fechar (fim da animação). Serve para
   * abrir outro Modal em seguida: o iOS não mostra um segundo Modal enquanto o
   * primeiro ainda está na tela.
   */
  onClosed?: () => void;
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
  confirmIcon = Check,
  cancelAppearance = 'danger',
  onCancel,
  onClosed,
}: ConfirmSheetProps) {
  const sheet = useSheetAnimation(visible, onCancel);
  const wasRendered = useRef(sheet.isRendered);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  useEffect(() => {
    if (wasRendered.current && !sheet.isRendered) onClosedRef.current?.();
    wasRendered.current = sheet.isRendered;
  }, [sheet.isRendered]);

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={{ flex: 1, opacity: sheet.progress }}>
        <Pressable
          className="flex-1 justify-end bg-background-shade"
          onPress={onCancel}
        >
          <Animated.View style={sheet.sheetStyle} {...sheet.panHandlers}>
            <Pressable
              className="gap-4 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4"
              onPress={e => e.stopPropagation()}
            >
              <View className="mb-2 h-1 w-10 self-center rounded-full bg-details-primary" />

              <Text className="text-xl font-bold text-label-primary">
                {title}
              </Text>
              {message ? (
                <Text className="text-[15px] text-label-primary">
                  {message}
                </Text>
              ) : null}

              <Button
                shape="pill"
                icon={confirmIcon}
                className="h-[49px] w-full"
                onPress={onConfirm}
              >
                <Text className="font-semibold">{confirmLabel}</Text>
              </Button>
              {cancelLabel ? (
                <Button
                  shape="pill"
                  variant={
                    cancelAppearance === 'danger' ? 'secondary' : 'default'
                  }
                  icon={X}
                  className="h-[49px] w-full"
                  accessibilityLabel={cancelLabel}
                  onPress={onCancel}
                >
                  <Text className="font-semibold">{cancelLabel}</Text>
                </Button>
              ) : null}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export { ConfirmSheet };
export type { ConfirmSheetProps };

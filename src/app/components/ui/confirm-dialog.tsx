import { X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

const MAX_WIDTH = 400;
const INITIAL_SCALE = 0.94;

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: MAX_WIDTH },
});

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  /** Sem ele, só o confirmar aparece. Tocar fora continua chamando `onCancel`. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** No círculo acima do título: a lixeira numa exclusão, um alerta num aviso. */
  icon?: LucideIcon;
  /** 'danger' pinta o ícone de vermelho; 'neutral' o deixa marrom. */
  tone?: 'danger' | 'neutral';
  confirmIcon?: LucideIcon;
  /**
   * 'danger' (padrão) pinta o cancelar de vermelho, como a `ConfirmSheet`;
   * 'button' usa o marrom, para avisos sem risco.
   */
  cancelAppearance?: 'danger' | 'button';
  /** iOS: abra o próximo Modal aqui, quando este terminou de sair. */
  onClosed?: () => void;
  /** Entre a mensagem e os botões: o que mais acontece se a pessoa confirmar. */
  children?: ReactNode;
};

/**
 * Pergunta ou aviso no meio da tela. Uma exclusão que sobe de baixo, com os
 * botões empilhados, parece mais uma lista de opções do que um alerta; no
 * centro ela fica com cara de "tem certeza?", como os alertas do sistema.
 */
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  icon,
  tone = 'danger',
  confirmIcon,
  cancelAppearance = 'danger',
  onClosed,
  children,
}: ConfirmDialogProps) {
  // Só o `progress` e o `isRendered` servem aqui: o diálogo esmaece e cresce
  // um pouco no lugar, sem deslizar nem ser arrastado.
  const { isRendered, progress } = useSheetAnimation(visible);
  const wasRendered = useRef(isRendered);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  useEffect(() => {
    if (wasRendered.current && !isRendered) onClosedRef.current?.();
    wasRendered.current = isRendered;
  }, [isRendered]);
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
      aria-label={title}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          onPress={onCancel}
          className="flex-1 items-center justify-center bg-background-shade px-6"
        >
          <Animated.View
            accessibilityViewIsModal
            style={[styles.card, { transform: [{ scale }] }]}
          >
            <Pressable
              role="alertdialog"
              className="items-center gap-4 rounded-3xl bg-background-modal px-6 pb-6 pt-7 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.15)]"
              onPress={event => event.stopPropagation()}
            >
              {icon ? (
                <View className="size-14 items-center justify-center rounded-full bg-details-primary">
                  <Icon
                    as={icon}
                    size={26}
                    className={
                      tone === 'danger'
                        ? 'text-button-secondary'
                        : 'text-label-quartenery'
                    }
                  />
                </View>
              ) : null}

              <View className="w-full gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-center text-xl font-bold text-label-primary"
                >
                  {title}
                </Text>
                {message ? (
                  <Text className="text-center text-[15px] leading-[22px] text-label-primary">
                    {message}
                  </Text>
                ) : null}
              </View>

              {children ? <View className="w-full">{children}</View> : null}

              <View className="w-full gap-2.5 pt-1">
                <Button
                  shape="pill"
                  icon={confirmIcon}
                  className="h-12 w-full"
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
                    className="h-12 w-full"
                    accessibilityLabel={cancelLabel}
                    onPress={onCancel}
                  >
                    <Text className="font-semibold">{cancelLabel}</Text>
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

export { ConfirmDialog };
export type { ConfirmDialogProps };

import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

const MAX_WIDTH = 400;
const INITIAL_SCALE = 0.98;

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
  /** Ícone discreto ao lado do título. */
  icon?: LucideIcon;
  /** 'danger' dá destaque vermelho à confirmação; 'neutral' usa o marrom. */
  tone?: 'danger' | 'neutral';
  confirmIcon?: LucideIcon;
  /**
   * 'danger' (padrão) deixa o cancelar contornado; 'button' usa o marrom para
   * avisos neutros que precisam de duas ações equivalentes.
   */
  cancelAppearance?: 'danger' | 'button';
  /** iOS: abra o próximo Modal aqui, quando este terminou de sair. */
  onClosed?: () => void;
  /** Entre a mensagem e os botões: o que mais acontece se a pessoa confirmar. */
  children?: ReactNode;
};

/**
 * Pergunta ou aviso compacto no meio da tela. Hierarquia simples, texto
 * alinhado à esquerda e uma ação principal clara.
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
              className="gap-4 rounded-2xl border border-border-primary bg-background-modal p-5 shadow-[0px_12px_24px_-10px_rgba(0,0,0,0.16)]"
              onPress={event => event.stopPropagation()}
            >
              {icon ? (
                <View className="flex-row items-center gap-2">
                  <Icon
                    as={icon}
                    size={18}
                    className={
                      tone === 'danger'
                        ? 'text-button-secondary'
                        : 'text-label-quartenery'
                    }
                  />
                  <Text
                    accessibilityRole="header"
                    className="text-[17px] font-semibold text-label-primary"
                  >
                    {title}
                  </Text>
                </View>
              ) : (
                <Text
                  accessibilityRole="header"
                  className="text-[17px] font-semibold text-label-primary"
                >
                  {title}
                </Text>
              )}

              <View className="w-full gap-2">
                {message ? (
                  <Text className="text-[14px] leading-5 text-label-tertiary">
                    {message}
                  </Text>
                ) : null}
              </View>

              {children ? <View className="w-full">{children}</View> : null}

              <View className="w-full gap-2 pt-1">
                <Button
                  variant={tone === 'danger' ? 'destructive' : 'default'}
                  shape="pill"
                  icon={confirmIcon}
                  className="h-[46px] w-full"
                  onPress={onConfirm}
                >
                  <Text className="font-semibold">{confirmLabel}</Text>
                </Button>
                {cancelLabel ? (
                  <Button
                    shape="pill"
                    variant={
                      cancelAppearance === 'danger' ? 'outline' : 'default'
                    }
                    className="h-[46px] w-full"
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

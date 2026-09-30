import { Trash2 } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type InventoryNotificationCardProps = {
  title: string;
  description: string;
  elapsed: string;
  /**
   * Texto da ação de apagar. Não aparece na tela — o fundo revelado mostra o
   * ícone de lixeira —, mas nomeia a ação para leitores de tela.
   */
  deleteLabel: string;
  onDismiss?: () => void;
};

/** Abaixo disso o gesto é considerado um toque ou uma rolagem, não um arrasto. */
const DRAG_ACTIVATION = 8;
/** Fração da largura a partir da qual soltar o card o apaga. */
const DISMISS_RATIO = 0.35;
/**
 * Usada só no cálculo do gesto, caso alguém consiga arrastar antes do primeiro
 * `onLayout`. A largura visual não depende deste número.
 */
const FALLBACK_WIDTH = 320;

/**
 * Ação própria no rotor do leitor de tela. Antes isto usava `magicTap`, que no
 * iOS é o toque de dois dedos reservado à ação principal do app inteiro — não
 * a um item de lista.
 */
const DISMISS_ACTION = 'dismiss';

/**
 * O target web não tem o módulo nativo de animação e loga um aviso a cada
 * gesto. Em web a animação cai para JS, que é o que ele já fazia — só sem
 * poluir o console que o time usa para checagem rápida.
 */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Apresentacional: recebe as três linhas já traduzidas. Serve tanto ao alerta
 * de estoque mínimo quanto ao de validade — o que muda entre eles é só o
 * texto, não o desenho.
 *
 * O gesto de arrastar mora aqui porque é comportamento visual do card; o que
 * *significa* apagar é decisão da tela, que recebe o `onDismiss`.
 *
 * Usa `PanResponder`/`Animated` do próprio React Native em vez de
 * `react-native-gesture-handler`: na versão 3 daquele pacote o `Swipeable`
 * simples deixou de existir e sobrou só o baseado em Reanimated, que traria
 * mais uma dependência e um plugin de Babel para um arrasto horizontal.
 */
export function InventoryNotificationCard({
  title,
  description,
  elapsed,
  deleteLabel,
  onDismiss,
}: InventoryNotificationCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  // A largura medida serve ao gesto (limiar e distância da saída), não ao
  // layout: fica num ref para não re-renderizar a cada medição.
  const widthRef = useRef(FALLBACK_WIDTH);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Só assume o gesto quando ele é claramente horizontal, para não
        // roubar a rolagem vertical da lista.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          onDismiss !== undefined &&
          Math.abs(gesture.dx) > DRAG_ACTIVATION &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),

        onPanResponderMove: (_event, gesture) => {
          // Só para a esquerda: arrastar para a direita não apaga nada.
          translateX.setValue(Math.min(0, gesture.dx));
        },

        onPanResponderRelease: (_event, gesture) => {
          const passedThreshold =
            -gesture.dx > widthRef.current * DISMISS_RATIO;

          if (passedThreshold) {
            Animated.timing(translateX, {
              toValue: -widthRef.current,
              duration: 180,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start(() => onDismiss?.());
            return;
          }

          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
        },

        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
        },
      }),
    [onDismiss, translateX],
  );

  return (
    <View
      className="w-full"
      onLayout={event => {
        widthRef.current = event.nativeEvent.layout.width;
      }}
      // Arrastar é inacessível por si só: expõe a mesma ação para leitores de
      // tela e teclado.
      accessible
      accessibilityLabel={`${title}. ${description}. ${elapsed}`}
      accessibilityActions={
        onDismiss ? [{ name: DISMISS_ACTION, label: deleteLabel }] : undefined
      }
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === DISMISS_ACTION) {
          onDismiss?.();
        }
      }}
    >
      <View
        className="absolute inset-0 items-end justify-center rounded-[14px] bg-button-secondary pr-5"
        pointerEvents="none"
      >
        <Icon as={Trash2} size={20} className="text-white" />
      </View>

      {/* className não chega no Animated.View — o visual mora na View comum de dentro. */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View className="w-full flex-row items-start gap-2.5 rounded-[14px] bg-white px-4 py-3">
          <View className="mt-1 size-2 shrink-0 rounded bg-details-tertiary" />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-label-primary">
              {title}
            </Text>
            <Text className="pt-0.5 text-xs text-label-tertiary">
              {description}
            </Text>
            <Text className="text-xs text-label-tertiary">{elapsed}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // `stretch` em vez de largura em pixels: o card acompanha a tela e cresce
    // quando o nome do item quebra em duas linhas. Antes havia um 320 inicial
    // que só virava a largura real depois do primeiro `onLayout`, o que dava
    // um quadro estreito na abertura.
    alignSelf: 'stretch',
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});

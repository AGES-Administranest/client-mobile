import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from 'app/components/ui/text';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Faixa do fundo escurecido que continua aparecendo acima do sheet mais alto,
// para ainda dar para fechar tocando fora.
const SHEET_TOP_GAP = 8;

type ClinicSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

function ClinicSheet({
  visible,
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: ClinicSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: visible ? 0 : SCREEN_HEIGHT,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, backdropOpacity, sheetTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            className="flex-1 bg-background-shade"
          />
        </Animated.View>

        {/* O className não era aplicado neste Animated.View (na web o sheet
            aparecia sem fundo e sem padding): a animação fica nele e o visual
            vai no View de dentro, como no ItemModal. */}
        {/* Como no Figma, o form inteiro cabe sem rolagem: o sheet pode subir
            até logo abaixo da barra de status. A ScrollView só entra em tela
            pequena ou com o teclado aberto. */}
        <Animated.View
          style={{
            maxHeight: windowHeight - insets.top - SHEET_TOP_GAP,
            transform: [{ translateY: sheetTranslateY }],
          }}
        >
          <View className="shrink gap-4 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

            <Text className="text-xl font-bold text-label-primary">
              {title}
            </Text>

            <View className="h-px bg-details-primary" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-3.5 pb-1"
            >
              {children}
            </ScrollView>

            {footer}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { ClinicSheet };
export type { ClinicSheetProps };

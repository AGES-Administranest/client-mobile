import { type ReactNode } from 'react';
import {
  Animated,
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
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

// Faixa do fundo escurecido que continua aparecendo acima do sheet mais alto,
// para ainda dar para fechar tocando fora.
const SHEET_TOP_GAP = 8;

const styles = StyleSheet.create({
  // Sem encolher, o teclado do iOS empurraria o topo do sheet para fora da
  // tela em vez de deixar a lista de campos rolar.
  sheet: { flexShrink: 1 },
});

type EntrySheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

/** Mesmo esqueleto do sheet de clínicas: o formulário cabe sem rolagem, como no Figma. */
export function EntrySheet({
  visible,
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: EntrySheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheet = useSheetAnimation(visible, onClose);

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: sheet.progress }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            className="flex-1 bg-background-shade"
          />
        </Animated.View>

        {/* className em Animated.View não é aplicado na web: a animação fica
            nele e o visual vai no View de dentro. */}
        <Animated.View
          {...sheet.panHandlers}
          style={[
            styles.sheet,
            {
              maxHeight: windowHeight - insets.top - SHEET_TOP_GAP,
              ...sheet.sheetStyle,
            },
          ]}
        >
          <View className="shrink gap-4 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
            <View className="h-1 w-10 self-center rounded-full bg-border-primary" />

            <Text
              accessibilityRole="header"
              className="text-base font-bold text-label-primary"
            >
              {title}
            </Text>

            <View className="h-px bg-border-primary" />

            {/* Só rola em tela pequena ou com o teclado aberto. */}
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

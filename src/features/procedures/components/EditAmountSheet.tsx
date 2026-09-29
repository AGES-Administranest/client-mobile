import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { LabelPlaceholder } from 'theme/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type EditAmountSheetTexts = {
  title: string;
  placeholder: string;
  confirm: string;
};

type EditAmountSheetProps = {
  visible: boolean;
  value: string;
  errorText: string | null;
  submitting: boolean;
  texts: EditAmountSheetTexts;
  onChangeValue: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

// Mesma folha do CancelAppointmentSheet, com um campo numérico no lugar do
// motivo.
export function EditAmountSheet({
  visible,
  value,
  errorText,
  submitting,
  texts,
  onChangeValue,
  onConfirm,
  onClose,
}: EditAmountSheetProps) {
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* style, não className: na web o NativeWind não aplica className em
            Animated.View, e sem flex: 1 a folha subia para o topo. */}
        <Animated.View style={{ flex: 1, opacity: overlayOpacity }}>
          <Pressable
            className="flex-1 justify-end bg-background-shade"
            onPress={onClose}
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
                  {texts.title}
                </Text>

                <View>
                  <TextInput
                    className="rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
                    placeholder={texts.placeholder}
                    placeholderTextColor={LabelPlaceholder}
                    accessibilityLabel={texts.title}
                    value={value}
                    onChangeText={onChangeValue}
                    editable={!submitting}
                    keyboardType="decimal-pad"
                  />
                  {errorText ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      {errorText}
                    </Text>
                  ) : null}
                </View>

                <Button
                  icon={Check}
                  shape="pill"
                  className="h-[49px] w-full"
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={texts.confirm}
                  accessibilityState={{
                    disabled: submitting,
                    busy: submitting,
                  }}
                  onPress={onConfirm}
                >
                  <Text className="font-semibold">{texts.confirm}</Text>
                </Button>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

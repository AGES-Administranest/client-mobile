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

import { CANCELLATION_REASON_MAX_LENGTH } from '../domain/validateCancellationReason';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type CancelAppointmentSheetTexts = {
  title: string;
  reasonPlaceholder: string;
  confirm: string;
};

type CancelAppointmentSheetProps = {
  visible: boolean;
  reason: string;
  errorText: string | null;
  submitting: boolean;
  texts: CancelAppointmentSheetTexts;
  onChangeReason: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function CancelAppointmentSheet({
  visible,
  reason,
  errorText,
  submitting,
  texts,
  onChangeReason,
  onConfirm,
  onClose,
}: CancelAppointmentSheetProps) {
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
        <Animated.View className="flex-1" style={{ opacity: overlayOpacity }}>
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
                    className="h-24 rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
                    placeholder={texts.reasonPlaceholder}
                    placeholderTextColor={LabelPlaceholder}
                    accessibilityLabel={texts.title}
                    value={reason}
                    onChangeText={onChangeReason}
                    editable={!submitting}
                    multiline
                    numberOfLines={4}
                    maxLength={CANCELLATION_REASON_MAX_LENGTH}
                    textAlignVertical="top"
                  />
                  {errorText ? (
                    <Text className="mt-1 text-xs text-alert-primary">
                      {errorText}
                    </Text>
                  ) : null}
                </View>

                <Button
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

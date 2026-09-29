import { Check, X } from 'lucide-react-native';
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
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

import type { RescheduleField, RescheduleValues } from '../domain/reschedule';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type RescheduleAppointmentSheetTexts = {
  title: string;
  message: string;
  date: string;
  startTime: string;
  endTime: string;
  confirm: string;
  dismiss: string;
};

type RescheduleAppointmentSheetProps = {
  visible: boolean;
  values: RescheduleValues;
  /** Já traduzidos, por campo. */
  fieldErrors: Partial<Record<RescheduleField, string>>;
  /** Conflito ou falha do backend, já traduzido. */
  errorText: string | null;
  submitting: boolean;
  texts: RescheduleAppointmentSheetTexts;
  onChangeField: (field: RescheduleField, value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

const PLACEHOLDERS: Record<RescheduleField, string> = {
  date: 'DD/MM/AAAA',
  startTime: 'HH:MM',
  endTime: 'HH:MM',
};

export function RescheduleAppointmentSheet({
  visible,
  values,
  fieldErrors,
  errorText,
  submitting,
  texts,
  onChangeField,
  onConfirm,
  onClose,
}: RescheduleAppointmentSheetProps) {
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

  const field = (name: RescheduleField, label: string) => (
    <View className="flex-1 gap-1">
      <Text className="text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        className={cn(
          'rounded-xl border bg-white px-4 py-3 text-base text-label-primary',
          fieldErrors[name] ? 'border-alert-primary' : 'border-border-primary',
        )}
        accessibilityLabel={label}
        placeholder={PLACEHOLDERS[name]}
        placeholderTextColor={LabelPlaceholder}
        value={values[name]}
        onChangeText={value => onChangeField(name, value)}
        editable={!submitting}
        keyboardType="number-pad"
        inputMode="numeric"
      />
      {fieldErrors[name] ? (
        <Text className="text-xs text-alert-primary">{fieldErrors[name]}</Text>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
                <Text className="text-[15px] text-label-primary">
                  {texts.message}
                </Text>

                {field('date', texts.date)}
                <View className="flex-row gap-3">
                  {field('startTime', texts.startTime)}
                  {field('endTime', texts.endTime)}
                </View>

                {errorText ? (
                  <Text className="text-xs text-alert-primary">
                    {errorText}
                  </Text>
                ) : null}

                <Button
                  shape="pill"
                  icon={Check}
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
                <Button
                  shape="pill"
                  variant="secondary"
                  icon={X}
                  className="h-[49px] w-full"
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={texts.dismiss}
                  accessibilityState={{ disabled: submitting }}
                  onPress={onClose}
                >
                  <Text className="font-semibold">{texts.dismiss}</Text>
                </Button>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

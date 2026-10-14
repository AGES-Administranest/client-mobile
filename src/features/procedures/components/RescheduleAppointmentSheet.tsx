import { Check, X } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

import type { RescheduleField, RescheduleValues } from '../domain/reschedule';

export type RescheduleAppointmentSheetTexts = {
  title: string;
  message: string;
  date: string;
  startTime: string;
  endTime: string;
  confirm: string;
  dismiss: string;
  close: string;
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
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      footer={
        <>
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
        </>
      }
    >
      <Text className="text-[15px] text-label-primary">{texts.message}</Text>

      {field('date', texts.date)}
      <View className="flex-row gap-3">
        {field('startTime', texts.startTime)}
        {field('endTime', texts.endTime)}
      </View>

      {errorText ? (
        <Text className="text-xs text-alert-primary">{errorText}</Text>
      ) : null}
    </BottomSheet>
  );
}

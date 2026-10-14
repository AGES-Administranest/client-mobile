import { Check, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

import {
  CANCELLATION_REASON_PRESETS,
  type CancellationReasonPreset,
} from '../domain/cancellationReasonPresets';
import { CANCELLATION_REASON_MAX_LENGTH } from '../domain/validateCancellationReason';

export type CancelAppointmentSheetTexts = {
  title: string;
  reason: string;
  reasons: Record<CancellationReasonPreset, string>;
  reasonPlaceholder: string;
  confirm: string;
  dismiss: string;
  close: string;
};

type CancelAppointmentSheetProps = {
  visible: boolean;
  preset: CancellationReasonPreset | null;
  reason: string;
  errorText: string | null;
  submitting: boolean;
  texts: CancelAppointmentSheetTexts;
  onSelectPreset: (preset: CancellationReasonPreset) => void;
  onChangeReason: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function CancelAppointmentSheet({
  visible,
  preset,
  reason,
  errorText,
  submitting,
  texts,
  onSelectPreset,
  onChangeReason,
  onConfirm,
  onClose,
}: CancelAppointmentSheetProps) {
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
      <Text className="text-[15px] text-label-primary">{texts.reason}</Text>

      <View className="flex-row flex-wrap gap-2">
        {CANCELLATION_REASON_PRESETS.map(option => {
          const selected = preset === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: submitting }}
              accessibilityLabel={texts.reasons[option]}
              disabled={submitting}
              onPress={() => onSelectPreset(option)}
              className={cn(
                'rounded-full px-3 py-2',
                selected ? 'bg-button-primary' : 'bg-details-primary',
              )}
            >
              <Text
                className={cn(
                  'text-xs font-semibold',
                  selected ? 'text-label-secondary' : 'text-label-primary',
                )}
              >
                {texts.reasons[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sempre à vista: sozinho é o motivo, com um chip vira o detalhe dele. */}
      <View>
        <TextInput
          className="h-24 rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
          placeholder={texts.reasonPlaceholder}
          placeholderTextColor={LabelPlaceholder}
          accessibilityLabel={texts.reason}
          value={reason}
          onChangeText={onChangeReason}
          editable={!submitting}
          multiline
          numberOfLines={4}
          maxLength={CANCELLATION_REASON_MAX_LENGTH}
          textAlignVertical="top"
        />
        {errorText ? (
          <Text className="mt-1 text-xs text-alert-primary">{errorText}</Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

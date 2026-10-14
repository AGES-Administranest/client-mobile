import { Check } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { LabelPlaceholder } from 'theme/colors';

export type EditAmountSheetTexts = {
  title: string;
  placeholder: string;
  confirm: string;
  close: string;
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
  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      footer={
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
      }
    >
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
          <Text className="mt-1 text-xs text-alert-primary">{errorText}</Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

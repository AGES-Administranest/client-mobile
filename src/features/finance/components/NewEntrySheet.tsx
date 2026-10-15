import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { EntryFormFields, type EntryFormTexts } from './EntryFormFields';

type NewEntrySheetTexts = {
  title: string;
  close: string;
  save: string;
  saving: string;
  fields: EntryFormTexts;
};

type NewEntrySheetProps = Omit<
  React.ComponentProps<typeof EntryFormFields>,
  'texts'
> & {
  visible: boolean;
  texts: NewEntrySheetTexts;
  failureMessage: string | null;
  isSaving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export function NewEntrySheet({
  visible,
  texts,
  failureMessage,
  isSaving,
  canSubmit,
  onSubmit,
  onClose,
  ...fieldProps
}: NewEntrySheetProps) {
  // Um aviso que aparece não é lido sozinho pelo VoiceOver nem pelo TalkBack.
  useEffect(() => {
    if (failureMessage) {
      AccessibilityInfo.announceForAccessibility(failureMessage);
    }
  }, [failureMessage]);

  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      footer={
        <>
          {failureMessage ? (
            <View
              role="alert"
              accessibilityLiveRegion="polite"
              className="rounded-xl border border-alert-primary bg-white p-3"
            >
              <Text className="text-sm text-alert-primary">
                {failureMessage}
              </Text>
            </View>
          ) : null}
          <ActionButton
            testID="finance-new-entry-save"
            label={isSaving ? texts.saving : texts.save}
            icon={<Icon as={Check} size={16} />}
            disabled={!canSubmit}
            accessibilityState={{ disabled: !canSubmit, busy: isSaving }}
            onPress={onSubmit}
          />
        </>
      }
    >
      <EntryFormFields {...fieldProps} texts={texts.fields} />
    </BottomSheet>
  );
}

import { Check, Trash2, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
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

/** Na edição: Cancelar ao lado do Salvar, e a pergunta antes de perder o que mudou. */
export type EntryEditActions = {
  cancel: string;
  discard: { message: string; confirm: string; keep: string };
  isConfirmingDiscard: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
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
  editActions?: EntryEditActions | null;
  onSubmit: () => void;
  onClose: () => void;
  onClosed?: () => void;
};

export function NewEntrySheet({
  visible,
  texts,
  failureMessage,
  isSaving,
  canSubmit,
  editActions = null,
  onSubmit,
  onClose,
  onClosed,
  ...fieldProps
}: NewEntrySheetProps) {
  // Um aviso que aparece não é lido sozinho pelo VoiceOver nem pelo TalkBack.
  useEffect(() => {
    if (failureMessage) {
      AccessibilityInfo.announceForAccessibility(failureMessage);
    }
  }, [failureMessage]);

  const isConfirmingDiscard = editActions?.isConfirmingDiscard ?? false;
  const discardMessage = editActions?.discard.message;
  useEffect(() => {
    if (isConfirmingDiscard && discardMessage) {
      AccessibilityInfo.announceForAccessibility(discardMessage);
    }
  }, [isConfirmingDiscard, discardMessage]);

  const saveButton = (
    <ActionButton
      testID="finance-new-entry-save"
      label={isSaving ? texts.saving : texts.save}
      icon={<Icon as={Check} size={16} />}
      disabled={!canSubmit}
      accessibilityState={{ disabled: !canSubmit, busy: isSaving }}
      className={editActions ? 'w-auto flex-1' : undefined}
      onPress={onSubmit}
    />
  );

  const actions = !editActions ? (
    saveButton
  ) : isConfirmingDiscard ? (
    <View role="alert" className="gap-3">
      <Text className="text-[15px] text-label-primary">
        {editActions.discard.message}
      </Text>
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          shape="pill"
          className="h-[49px] flex-1 border-border-primary bg-white"
          onPress={editActions.onKeepEditing}
        >
          <Text className="text-sm font-medium text-label-primary">
            {editActions.discard.keep}
          </Text>
        </Button>
        <ActionButton
          label={editActions.discard.confirm}
          variant="secondary"
          icon={<Icon as={Trash2} size={16} />}
          className="w-auto flex-1"
          onPress={editActions.onDiscard}
        />
      </View>
    </View>
  ) : (
    <View className="flex-row gap-3">
      <Button
        variant="outline"
        shape="pill"
        icon={X}
        disabled={isSaving}
        className="h-[49px] flex-1 border-border-primary bg-white"
        onPress={editActions.onCancel}
      >
        <Text className="text-sm font-medium text-label-primary">
          {editActions.cancel}
        </Text>
      </Button>
      {saveButton}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onClose}
      onClosed={onClosed}
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
          {actions}
        </>
      }
    >
      <EntryFormFields {...fieldProps} texts={texts.fields} />
    </BottomSheet>
  );
}

import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { ClinicFields, type ClinicFieldTexts } from './ClinicFields';
import { ClinicSheet } from './ClinicSheet';
import type { ClinicDraft, ClinicField } from '../domain/clinicForm';

type NewClinicSheetProps = {
  visible: boolean;
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  title: string;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  confirmLabel: string;
  savingLabel: string;
  closeLabel: string;
  onChangeField: (field: ClinicField, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function NewClinicSheet({
  visible,
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  title,
  fieldTexts,
  confirmLabel,
  savingLabel,
  closeLabel,
  onChangeField,
  onSubmit,
  onClose,
}: NewClinicSheetProps) {
  return (
    <ClinicSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        <>
          {failureMessage ? (
            <View className="rounded-xl border border-alert-primary bg-white p-3">
              <Text className="text-sm text-alert-primary">
                {failureMessage}
              </Text>
            </View>
          ) : null}

          <Button
            shape="pill"
            className="h-[49px] w-full bg-button-primary"
            onPress={onSubmit}
            disabled={isSaving}
          >
            <Icon as={Check} className="size-5" />
            <Text className="font-semibold">
              {isSaving ? savingLabel : confirmLabel}
            </Text>
          </Button>
        </>
      }
    >
      <ClinicFields
        draft={draft}
        fieldErrors={fieldErrors}
        fieldTexts={fieldTexts}
        onChangeField={onChangeField}
      />
    </ClinicSheet>
  );
}

export { NewClinicSheet };
export type { NewClinicSheetProps };

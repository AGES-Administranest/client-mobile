import { Check, Pencil, Phone, Trash2 } from 'lucide-react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { ClinicFields, type ClinicFieldTexts } from './ClinicFields';
import { ClinicSheet } from './ClinicSheet';
import type { ClinicDraft, ClinicField } from '../domain/clinicForm';

type ClinicDetailSheetLabels = {
  call: string;
  edit: string;
  confirm: string;
  delete: string;
};

type ClinicDetailSheetProps = {
  visible: boolean;
  title: string;
  editing: boolean;
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  labels: ClinicDetailSheetLabels;
  closeLabel: string;
  onChangeField: (field: ClinicField, value: string) => void;
  onCall?: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function ClinicDetailSheet({
  visible,
  title,
  editing,
  draft,
  fieldErrors,
  fieldTexts,
  labels,
  closeLabel,
  onChangeField,
  onCall,
  onEdit,
  onConfirm,
  onDelete,
  onClose,
}: ClinicDetailSheetProps) {
  return (
    <ClinicSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        editing ? (
          <>
            <Button
              shape="pill"
              className="h-[49px] w-full"
              onPress={onConfirm}
            >
              <Icon as={Check} className="size-5" />
              <Text className="font-semibold">{labels.confirm}</Text>
            </Button>
            <Button
              shape="pill"
              className="h-[49px] w-full bg-button-secondary"
              onPress={onDelete}
            >
              <Icon as={Trash2} className="size-5" />
              <Text className="font-semibold">{labels.delete}</Text>
            </Button>
          </>
        ) : (
          <>
            {onCall ? (
              <Button shape="pill" className="h-[49px] w-full" onPress={onCall}>
                <Icon as={Phone} className="size-5" />
                <Text className="font-semibold">{labels.call}</Text>
              </Button>
            ) : null}
            <Button shape="pill" className="h-[49px] w-full" onPress={onEdit}>
              <Icon as={Pencil} className="size-5" />
              <Text className="font-semibold">{labels.edit}</Text>
            </Button>
          </>
        )
      }
    >
      <ClinicFields
        draft={draft}
        fieldErrors={fieldErrors}
        fieldTexts={fieldTexts}
        editable={editing}
        onChangeField={onChangeField}
      />
    </ClinicSheet>
  );
}

export { ClinicDetailSheet };
export type { ClinicDetailSheetLabels, ClinicDetailSheetProps };

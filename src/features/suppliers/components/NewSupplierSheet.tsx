import { Check } from 'lucide-react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { SupplierFields, type SupplierFieldTexts } from './SupplierFields';
import type { SupplierDraft, SupplierField } from '../domain/supplierForm';

type NewSupplierSheetProps = {
  visible: boolean;
  title: string;
  draft: SupplierDraft;
  fieldErrors: Partial<Record<SupplierField, string>>;
  fieldTexts: Record<SupplierField, SupplierFieldTexts>;
  confirmLabel: string;
  closeLabel: string;
  isSaving: boolean;
  onChangeField: (field: SupplierField, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function NewSupplierSheet({
  visible,
  title,
  draft,
  fieldErrors,
  fieldTexts,
  confirmLabel,
  closeLabel,
  isSaving,
  onChangeField,
  onSubmit,
  onClose,
}: NewSupplierSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        <Button
          shape="pill"
          className="h-[49px] w-full bg-button-primary"
          onPress={onSubmit}
          disabled={isSaving}
        >
          <Icon as={Check} className="size-5" />
          <Text className="font-semibold">{confirmLabel}</Text>
        </Button>
      }
    >
      <SupplierFields
        draft={draft}
        fieldErrors={fieldErrors}
        fieldTexts={fieldTexts}
        onChangeField={onChangeField}
      />
    </BottomSheet>
  );
}

export { NewSupplierSheet };
export type { NewSupplierSheetProps };

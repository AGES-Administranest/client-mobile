import { Check, Pencil, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { SupplierFields, type SupplierFieldTexts } from './SupplierFields';
import type { SupplierDraft, SupplierField } from '../domain/supplierForm';

type SupplierDetailSheetLabels = {
  title: string;
  editTitle: string;
  edit: string;
  confirm: string;
  delete: string;
  status: string;
  active: string;
  inactive: string;
};

type SupplierDetailSheetProps = {
  visible: boolean;
  editing: boolean;
  draft: SupplierDraft;
  fieldErrors: Partial<Record<SupplierField, string>>;
  fieldTexts: Record<SupplierField, SupplierFieldTexts>;
  labels: SupplierDetailSheetLabels;
  closeLabel: string;
  isSaving: boolean;
  onChangeField: (field: SupplierField, value: string) => void;
  onChangeActive: (active: boolean) => void;
  onEdit: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function StatusOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'h-[39.5px] flex-1 items-center justify-center rounded-[10px]',
        selected
          ? 'bg-button-primary'
          : 'bg-white shadow-[0px_5px_5px_rgba(0,0,0,0.1)]',
      )}
    >
      <Text
        className={cn(
          'text-[13px] font-medium leading-[19.5px]',
          selected ? 'text-label-secondary' : 'text-label-primary',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SupplierDetailSheet({
  visible,
  editing,
  draft,
  fieldErrors,
  fieldTexts,
  labels,
  closeLabel,
  isSaving,
  onChangeField,
  onChangeActive,
  onEdit,
  onConfirm,
  onDelete,
  onClose,
}: SupplierDetailSheetProps) {
  const title = editing ? labels.editTitle : labels.title;

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      header={
        editing ? undefined : (
          <View className="flex-row items-center gap-2">
            <Text
              accessibilityRole="header"
              className="text-[22px] font-bold leading-[33px] text-label-primary"
            >
              {labels.title}
            </Text>
            <View
              className={cn(
                'rounded-md px-2 py-1',
                draft.active ? 'bg-details-finish' : 'bg-details-primary',
              )}
            >
              <Text className="text-[11px] font-bold leading-[16.5px] text-label-primary">
                {draft.active ? labels.active : labels.inactive}
              </Text>
            </View>
          </View>
        )
      }
      footer={
        editing ? (
          <>
            <Button
              shape="pill"
              className="h-[49px] w-full bg-button-primary"
              onPress={onConfirm}
              disabled={isSaving}
            >
              <Icon as={Check} className="size-5" />
              <Text className="font-semibold">{labels.confirm}</Text>
            </Button>
            <Button
              variant="secondary"
              shape="pill"
              className="h-[49px] w-full"
              onPress={onDelete}
              disabled={isSaving}
            >
              <Icon as={Trash2} className="size-5" />
              <Text className="font-semibold">{labels.delete}</Text>
            </Button>
          </>
        ) : (
          <Button
            shape="pill"
            className="h-[49px] w-full bg-button-primary"
            onPress={onEdit}
          >
            <Icon as={Pencil} className="size-5" />
            <Text className="font-semibold">{labels.edit}</Text>
          </Button>
        )
      }
    >
      <SupplierFields
        draft={draft}
        fieldErrors={fieldErrors}
        fieldTexts={fieldTexts}
        showName={editing}
        editable={editing}
        onChangeField={onChangeField}
      />
      {editing ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase leading-[18px] tracking-[0.48px] text-label-primary">
            {labels.status}
          </Text>
          <View accessibilityRole="radiogroup" className="flex-row gap-2">
            <StatusOption
              label={labels.active}
              selected={draft.active}
              onPress={() => onChangeActive(true)}
            />
            <StatusOption
              label={labels.inactive}
              selected={!draft.active}
              onPress={() => onChangeActive(false)}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

export { SupplierDetailSheet };
export type { SupplierDetailSheetLabels, SupplierDetailSheetProps };

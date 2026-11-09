import { Check, Pencil, Phone, Trash2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { SegmentedControl } from 'app/components/ui/segmented-control';
import { Text } from 'app/components/ui/text';
import { ButtonPrimary } from 'theme/colors';

import { ClinicFields, type ClinicFieldTexts } from './ClinicFields';
import type { ClinicDraft, ClinicField } from '../domain/clinicForm';

type ClinicDetailSheetLabels = {
  call: string;
  edit: string;
  confirm: string;
  delete: string;
};

type ClinicDetailSheetTab = 'history' | 'data';

type ClinicDetailSheetTabs = {
  value: ClinicDetailSheetTab;
  labels: Record<ClinicDetailSheetTab, string>;
  onChange: (tab: ClinicDetailSheetTab) => void;
  history: ReactNode;
};

type ClinicDetailSheetProps = {
  visible: boolean;
  title: string;
  editing: boolean;
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  labels: ClinicDetailSheetLabels;
  closeLabel: string;
  tabs?: ClinicDetailSheetTabs;
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
  failureMessage,
  isSaving,
  fieldTexts,
  labels,
  closeLabel,
  tabs,
  onChangeField,
  onCall,
  onEdit,
  onConfirm,
  onDelete,
  onClose,
}: ClinicDetailSheetProps) {
  const visibleTabs = editing ? undefined : tabs;
  const showsHistory = visibleTabs?.value === 'history';

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        showsHistory ? undefined : editing ? (
          <>
            {failureMessage ? (
              <View className="rounded-xl border border-alert-primary bg-white p-3">
                <Text className="text-sm text-alert-primary">
                  {failureMessage}
                </Text>
              </View>
            ) : null}
            <Button
              key="confirm"
              shape="pill"
              className="h-[49px] w-full bg-button-primary"
              style={{ backgroundColor: ButtonPrimary }}
              onPress={onConfirm}
              disabled={isSaving}
            >
              <Icon as={Check} className="size-5" />
              <Text className="font-semibold">{labels.confirm}</Text>
            </Button>
            <Button
              key="delete"
              variant="secondary"
              shape="pill"
              className="h-[49px] w-full"
              onPress={onDelete}
              disabled={isSaving}
            >
              <Icon as={Trash2} className="size-5" />
              <Text className="text-base font-semibold">{labels.delete}</Text>
            </Button>
          </>
        ) : (
          <>
            {onCall ? (
              <Button
                key="call"
                shape="pill"
                className="h-[49px] w-full bg-button-primary"
                onPress={onCall}
              >
                <Icon as={Phone} className="size-5" />
                <Text className="font-semibold">{labels.call}</Text>
              </Button>
            ) : null}
            <Button
              key="edit"
              shape="pill"
              className="h-[49px] w-full bg-button-primary"
              onPress={onEdit}
            >
              <Icon as={Pencil} className="size-5" />
              <Text className="font-semibold">{labels.edit}</Text>
            </Button>
          </>
        )
      }
    >
      {visibleTabs ? (
        <SegmentedControl
          options={[
            { value: 'history', label: visibleTabs.labels.history },
            { value: 'data', label: visibleTabs.labels.data },
          ]}
          value={visibleTabs.value}
          onValueChange={visibleTabs.onChange}
        />
      ) : null}
      {showsHistory ? (
        visibleTabs.history
      ) : (
        <ClinicFields
          draft={draft}
          fieldErrors={fieldErrors}
          fieldTexts={fieldTexts}
          editable={editing}
          showName={editing}
          onChangeField={onChangeField}
        />
      )}
    </BottomSheet>
  );
}

export { ClinicDetailSheet };
export type {
  ClinicDetailSheetLabels,
  ClinicDetailSheetProps,
  ClinicDetailSheetTab,
  ClinicDetailSheetTabs,
};

import { Check, Pencil, Phone, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

export type Clinic = {
  id: string;
  name: string;
  address: string;
  cityState: string;
  phone: string;
  responsible: string;
};

type ClinicDetailSheetLabels = {
  name: string;
  address: string;
  cityState: string;
  phone: string;
  responsible: string;
  call: string;
  edit: string;
  confirm: string;
  delete: string;
  editTitle: string;
};

type ClinicDetailSheetProps = {
  visible: boolean;
  clinic: Clinic | null;
  labels: ClinicDetailSheetLabels;
  onClose: () => void;
  onSave: (clinic: Clinic) => void;
  onDelete: (clinic: Clinic) => void;
};

function Field({
  label,
  value,
  editable,
  onChangeText,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-label-tertiary">
        {label}
      </Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        className="rounded-full border border-border-primary bg-white px-4 py-3 text-[15px] text-label-primary"
      />
    </View>
  );
}

function ClinicDetailSheet({
  visible,
  clinic,
  labels,
  onClose,
  onSave,
  onDelete,
}: ClinicDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Clinic | null>(clinic);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setEditing(false);
    setDraft(clinic);
  }, [visible, clinic]);

  const selected = clinic;
  if (!selected || !draft) {
    return null;
  }

  function update(field: keyof Clinic, value: string) {
    setDraft(current => (current ? { ...current, [field]: value } : current));
  }

  function handleCall() {
    const digits = selected.phone.replace(/\D/g, '');
    if (!digits) {
      return;
    }
    Linking.openURL(`tel:${digits}`).catch(() => undefined);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-background-shade"
        onPress={onClose}
      >
        <Pressable
          className="gap-5 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4"
          onPress={e => e.stopPropagation()}
        >
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-details-primary" />

          <Text className="text-xl font-bold text-label-primary">
            {editing ? labels.editTitle : selected.name}
          </Text>

          <View className="h-px bg-details-primary" />

          <View className="gap-4">
            {editing ? (
              <Field
                label={labels.name}
                value={draft.name}
                editable
                onChangeText={value => update('name', value)}
              />
            ) : null}
            <Field
              label={labels.address}
              value={editing ? draft.address : selected.address}
              editable={editing}
              onChangeText={value => update('address', value)}
            />
            <Field
              label={labels.cityState}
              value={editing ? draft.cityState : selected.cityState}
              editable={editing}
              onChangeText={value => update('cityState', value)}
            />
            <Field
              label={labels.phone}
              value={editing ? draft.phone : selected.phone}
              editable={editing}
              onChangeText={value => update('phone', value)}
            />
            <Field
              label={labels.responsible}
              value={editing ? draft.responsible : selected.responsible}
              editable={editing}
              onChangeText={value => update('responsible', value)}
            />
          </View>

          {editing ? (
            <View className="gap-3">
              <Button
                shape="pill"
                icon={Check}
                className="h-[49px] w-full bg-button-primary"
                onPress={() => onSave(draft)}
              >
                <Text className="font-semibold text-label-secondary">
                  {labels.confirm}
                </Text>
              </Button>
              <Button
                shape="pill"
                icon={Trash2}
                className="h-[49px] w-full bg-button-secondary"
                onPress={() => onDelete(selected)}
              >
                <Text className="font-semibold text-label-secondary">
                  {labels.delete}
                </Text>
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              <Button
                shape="pill"
                icon={Phone}
                className="h-[49px] w-full bg-button-primary"
                onPress={handleCall}
              >
                <Text className="font-semibold text-label-secondary">
                  {labels.call}
                </Text>
              </Button>
              <Button
                shape="pill"
                icon={Pencil}
                className="h-[49px] w-full bg-button-primary"
                onPress={() => setEditing(true)}
              >
                <Text className="font-semibold text-label-secondary">
                  {labels.edit}
                </Text>
              </Button>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { ClinicDetailSheet };
export type { ClinicDetailSheetLabels, ClinicDetailSheetProps };

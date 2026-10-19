import { ClipboardList, Pencil, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import {
  EntryReadOnlyField,
  type EntryReadOnlyFieldProps,
} from './EntryReadOnlyField';

type DetailField = Omit<EntryReadOnlyFieldProps, 'className'>;

export type EntryDetailFields = {
  nature: DetailField;
  description: DetailField;
  amount: DetailField;
  date: DetailField;
  category: DetailField;
  scope: DetailField;
};

export type EntryDetailOriginAction = {
  label: string;
  /** Origem sem tela no app: o botão aparece, desabilitado, com o motivo. */
  unavailableHint: string | null;
  onPress: () => void;
};

type EntryDetailSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  automaticBadge: string | null;
  fields: EntryDetailFields;
  lockedHint: string | null;
  originAction: EntryDetailOriginAction | null;
  texts: { close: string; edit: string; delete: string };
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onClosed?: () => void;
};

export function EntryDetailSheet({
  visible,
  title,
  subtitle,
  automaticBadge,
  fields,
  lockedHint,
  originAction,
  texts,
  onEdit,
  onDelete,
  onClose,
  onClosed,
}: EntryDetailSheetProps) {
  const originUnavailable = Boolean(originAction?.unavailableHint);

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={texts.close}
      onClose={onClose}
      onClosed={onClosed}
      header={
        <View className="gap-0.5">
          <View className="flex-row flex-wrap items-center gap-x-2">
            <Text
              accessibilityRole="header"
              className="shrink text-[22px] font-bold leading-[33px] text-label-primary"
            >
              {title}
            </Text>
            {automaticBadge ? (
              <View className="rounded-md bg-details-primary px-2 py-[3px]">
                <Text className="text-[11px] font-bold leading-[16.5px] text-label-primary">
                  {automaticBadge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs leading-[18px] text-label-tertiary">
            {subtitle}
          </Text>
        </View>
      }
      footer={
        <View className="gap-2.5">
          {originAction ? (
            <View className="gap-1.5">
              <ActionButton
                label={originAction.label}
                icon={<Icon as={ClipboardList} size={16} />}
                disabled={originUnavailable}
                accessibilityState={{ disabled: originUnavailable }}
                accessibilityHint={originAction.unavailableHint ?? undefined}
                onPress={originAction.onPress}
              />
              {originAction.unavailableHint ? (
                <Text className="text-center text-xs text-label-tertiary">
                  {originAction.unavailableHint}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View className="gap-2.5">
            <ActionButton
              label={texts.edit}
              icon={<Icon as={Pencil} size={16} />}
              onPress={onEdit}
            />
            <ActionButton
              label={texts.delete}
              variant="secondary"
              icon={<Icon as={Trash2} size={16} />}
              onPress={onDelete}
            />
          </View>
        </View>
      }
    >
      <EntryReadOnlyField {...fields.nature} />
      <EntryReadOnlyField {...fields.description} />
      <View className="gap-1.5">
        <View className="flex-row gap-2.5">
          <EntryReadOnlyField {...fields.amount} className="flex-1" />
          <EntryReadOnlyField {...fields.date} className="flex-1" />
        </View>
        {lockedHint ? (
          <Text className="text-[11px] leading-[16.5px] text-label-tertiary">
            {lockedHint}
          </Text>
        ) : null}
      </View>
      <EntryReadOnlyField {...fields.category} />
      <EntryReadOnlyField {...fields.scope} />
    </BottomSheet>
  );
}

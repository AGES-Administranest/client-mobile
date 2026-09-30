import {
  Check,
  Link2Off,
  Package,
  Pencil,
  Quote,
  Split,
  Trash2,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { FormField } from './FormField';
import { NoticeBanner } from './NoticeBanner';

type Value = { text: string; missing?: boolean };

export type ReviewLineLabels = {
  quantity: string;
  unit: string;
  unitValue: string;
  total: string;
  lineTotal: string;
  lot: string;
  expiry: string;
  datePlaceholder: string;
  edit: string;
  done: string;
  split: string;
  remove: string;
};

type ReviewLineCardProps = {
  labels: ReviewLineLabels;
  description: string;
  splitLabel?: string;
  /** Null when no item is linked. */
  linkName: string | null;
  unlinkedLabel: string;
  onLink: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  shown: {
    quantity: Value;
    unitValue: Value;
    total: Value;
    lot: Value;
    expiry: Value;
  };
  inputs: {
    quantity: string;
    unit: string;
    unitValue: string;
    lot: string;
    expiry: string;
  };
  lotMaxLength: number;
  onChangeQuantity: (text: string) => void;
  onChangeUnitValue: (text: string) => void;
  onChangeLot: (text: string) => void;
  onChangeExpiry: (text: string) => void;
  issue?: {
    blocking: boolean;
    message: string;
    fixLabel: string;
    onFix: () => void;
  };
  onSplit: () => void;
  onRemove: () => void;
};

export function ReviewLineCard({
  labels,
  description,
  splitLabel,
  linkName,
  unlinkedLabel,
  onLink,
  isEditing,
  onToggleEdit,
  shown,
  inputs,
  lotMaxLength,
  onChangeQuantity,
  onChangeUnitValue,
  onChangeLot,
  onChangeExpiry,
  issue,
  onRemove,
}: ReviewLineCardProps) {
  const isLinked = linkName !== null;

  return (
    <View
      style={styles.card}
      className={cn(
        'gap-3 rounded-2xl border bg-white p-4',
        !issue && 'border-transparent',
        issue?.blocking && 'border-alert-primary',
        issue && !issue.blocking && 'border-details-tertiary',
      )}
    >
      {splitLabel ? (
        <View className="flex-row items-center gap-1 self-start rounded-full bg-details-primary px-2 py-0.5">
          <Icon as={Split} size={12} className="text-label-quartenery" />
          <Text className="text-[11px] font-medium text-label-quartenery">
            {splitLabel}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-start gap-2">
        <Icon as={Quote} size={14} className="mt-0.5 text-label-tertiary" />
        <Text className="flex-1 text-xs text-label-tertiary">
          {description}
        </Text>
      </View>

      <Pressable
        onPress={onLink}
        accessibilityRole="button"
        className={cn(
          'flex-row items-center gap-2 rounded-lg px-3 py-2.5',
          isLinked
            ? 'bg-details-primary'
            : 'border border-dashed border-alert-primary bg-white',
        )}
      >
        <Icon
          as={isLinked ? Package : Link2Off}
          size={16}
          className={isLinked ? 'text-label-quartenery' : 'text-alert-primary'}
        />
        <Text
          className={cn(
            'flex-1 text-sm',
            isLinked ? 'text-label-primary' : 'text-alert-primary',
          )}
        >
          {linkName ?? unlinkedLabel}
        </Text>
      </Pressable>

      {isEditing ? (
        <View className="gap-3">
          <View className="flex-row gap-2">
            <FormField
              className="flex-1"
              label={labels.quantity}
              value={inputs.quantity}
              keyboardType="decimal-pad"
              onChangeText={onChangeQuantity}
            />
            <FormField
              className="flex-1"
              label={labels.unit}
              value={inputs.unit}
            />
            <FormField
              className="flex-[1.4]"
              label={labels.unitValue}
              value={inputs.unitValue}
              keyboardType="number-pad"
              onChangeText={onChangeUnitValue}
            />
          </View>
          <View className="flex-row gap-2">
            <FormField
              className="flex-1"
              label={labels.lot}
              value={inputs.lot}
              maxLength={lotMaxLength}
              onChangeText={onChangeLot}
            />
            <FormField
              className="flex-1"
              label={labels.expiry}
              value={inputs.expiry}
              placeholder={labels.datePlaceholder}
              keyboardType="number-pad"
              onChangeText={onChangeExpiry}
            />
          </View>
          <ShownValue label={labels.lineTotal} value={shown.total} strong />
        </View>
      ) : (
        <View className="gap-2">
          <View className="flex-row gap-2">
            <ShownValue label={labels.quantity} value={shown.quantity} />
            <ShownValue label={labels.unitValue} value={shown.unitValue} />
            <ShownValue label={labels.total} value={shown.total} strong />
          </View>
          <View className="flex-row gap-2">
            <ShownValue label={labels.lot} value={shown.lot} />
            <ShownValue label={labels.expiry} value={shown.expiry} />
            <View className="flex-1" />
          </View>
        </View>
      )}

      {issue ? (
        <NoticeBanner
          tone={issue.blocking ? 'alert' : 'warning'}
          message={issue.message}
          actionLabel={issue.fixLabel}
          onAction={issue.onFix}
        />
      ) : null}

      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={onToggleEdit}
          accessibilityRole="button"
          className={cn(
            'flex-row items-center gap-1 rounded-full border px-3 py-2',
            isEditing
              ? 'border-button-primary bg-button-primary'
              : 'border-border-primary bg-white',
          )}
        >
          <Icon
            as={isEditing ? Check : Pencil}
            size={14}
            className={
              isEditing ? 'text-label-secondary' : 'text-label-primary'
            }
          />
          <Text
            className={cn(
              'text-xs font-medium',
              isEditing ? 'text-label-secondary' : 'text-label-primary',
            )}
          >
            {isEditing ? labels.done : labels.edit}
          </Text>
        </Pressable>
        {/* Split is left out of this first version. The handler is still
            wired from the screen: to bring it back, restore this button and
            `onSplit` in the props above.
        <Pressable
          onPress={onSplit}
          accessibilityRole="button"
          className="flex-row items-center gap-1"
        >
          <Icon as={Split} size={14} className="text-label-quartenery" />
          <Text className="text-xs font-medium text-label-quartenery">
            {labels.split}
          </Text>
        </Pressable>
        */}
        <View className="flex-1" />
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={labels.remove}
          hitSlop={8}
        >
          <Icon as={Trash2} size={18} className="text-label-tertiary" />
        </Pressable>
      </View>
    </View>
  );
}

function ShownValue({
  label,
  value,
  strong,
}: {
  label: string;
  value: Value;
  strong?: boolean;
}) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
        {label}
      </Text>
      <Text
        className={cn(
          'text-sm',
          strong && 'font-bold',
          value.missing ? 'text-alert-primary' : 'text-label-primary',
        )}
      >
        {value.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

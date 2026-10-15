import { Check } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { ItemPicker } from 'app/components/ui/item-picker';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import {
  ADJUSTMENT_REASONS,
  type AdjustmentReason,
  type OutputAdjustmentDraft,
  type OutputAdjustmentErrors,
} from '../../../features/stock/domain/outputAdjustment';
import type { AdjustableItem } from '../../../features/stock/services/stockAdjustmentService';
import { LabelTertiary } from '../../../theme/colors';

type OutputAdjustmentModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  draft: OutputAdjustmentDraft;
  items: readonly AdjustableItem[];
  errors: OutputAdjustmentErrors;
  isSaving: boolean;
  needsWrittenReason: boolean;
  onItemChange: (itemId: string) => void;
  onQuantityChange: (quantity: string) => void;
  onReasonChange: (reason: AdjustmentReason) => void;
  onOtherReasonChange: (otherReason: string) => void;
  title: string;
  itemLabel: string;
  itemPlaceholder: string;
  quantityLabel: string;
  quantityPlaceholder: string;
  reasonLabel: string;
  otherReasonLabel: string;
  otherReasonPlaceholder: string;
  saveLabel: string;
  closeLabel: string;
  failureMessage: string | null;
  reasonLabels: Record<AdjustmentReason, string>;
  errorMessages: Record<string, string>;
  itemCaption?: (item: AdjustableItem) => string;
  noItemsMessage?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Text className="text-xs text-alert-primary">{message}</Text>;
}

function OutputAdjustmentModal({
  visible,
  onClose,
  onSubmit,
  draft,
  items,
  errors,
  isSaving,
  needsWrittenReason,
  onItemChange,
  onQuantityChange,
  onReasonChange,
  onOtherReasonChange,
  title,
  itemLabel,
  itemPlaceholder,
  quantityLabel,
  quantityPlaceholder,
  reasonLabel,
  otherReasonLabel,
  otherReasonPlaceholder,
  saveLabel,
  closeLabel,
  failureMessage,
  reasonLabels,
  errorMessages,
  itemCaption,
  noItemsMessage,
}: OutputAdjustmentModalProps) {
  return (
    <BottomSheet
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
            icon={Check}
            shape="pill"
            onPress={onSubmit}
            disabled={isSaving}
            className="h-12"
          >
            <Text>{saveLabel}</Text>
          </Button>
        </>
      }
    >
      <View className="gap-1">
        <Text className="text-xs font-medium uppercase text-label-tertiary">
          {itemLabel}
        </Text>
        <ItemPicker
          label={itemLabel}
          placeholder={itemPlaceholder}
          options={items.map(item => ({
            id: item.id,
            name: item.name,
            caption: itemCaption?.(item),
          }))}
          selectedId={draft.itemId}
          emptyMessage={noItemsMessage}
          hasError={Boolean(errors.itemId)}
          onSelect={onItemChange}
        />
        <FieldError message={errors.itemId && errorMessages.required} />
      </View>

      <View className="gap-1">
        <Text className="text-xs font-medium uppercase text-label-tertiary">
          {quantityLabel}
        </Text>
        <TextInput
          value={draft.quantity}
          onChangeText={onQuantityChange}
          placeholder={quantityPlaceholder}
          accessibilityLabel={quantityLabel}
          keyboardType="number-pad"
          inputMode="numeric"
          className="rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
          placeholderTextColor={LabelTertiary}
        />
        <FieldError
          message={errors.quantity && errorMessages[errors.quantity]}
        />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-medium uppercase text-label-tertiary">
          {reasonLabel}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ADJUSTMENT_REASONS.map(reason => {
            const isSelected = draft.reason === reason;

            return (
              <Pressable
                key={reason}
                accessibilityRole="button"
                accessibilityLabel={reasonLabels[reason]}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onReasonChange(reason)}
                className={cn(
                  'rounded-full border px-4 py-2',
                  isSelected
                    ? 'border-button-primary bg-button-primary'
                    : 'border-border-primary bg-white',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    isSelected && 'font-semibold text-label-secondary',
                  )}
                >
                  {reasonLabels[reason]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <FieldError message={errors.reason && errorMessages.required} />
      </View>

      {needsWrittenReason ? (
        <View className="gap-1">
          <Text className="text-xs font-medium uppercase text-label-tertiary">
            {otherReasonLabel}
          </Text>
          <TextInput
            value={draft.otherReason}
            onChangeText={onOtherReasonChange}
            placeholder={otherReasonPlaceholder}
            accessibilityLabel={otherReasonLabel}
            multiline
            className="min-h-20 rounded-xl border border-border-primary bg-white px-4 py-3 text-base text-label-primary"
            placeholderTextColor={LabelTertiary}
          />
          <FieldError message={errors.otherReason && errorMessages.required} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

export { OutputAdjustmentModal };
export type { OutputAdjustmentModalProps };

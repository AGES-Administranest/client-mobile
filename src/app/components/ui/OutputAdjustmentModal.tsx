import { Check, ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
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
}: OutputAdjustmentModalProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedItem = items.find(item => item.id === draft.itemId) ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-background-shade">
        <View className="max-h-[85%] rounded-t-3xl bg-background-modal p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text variant="h4">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
              className="size-8 items-center justify-center rounded-full bg-details-primary"
            >
              <Icon as={X} className="size-4 text-label-primary" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-4 pb-2">
            <View className="gap-1">
              <Text className="text-xs font-medium uppercase text-label-tertiary">
                {itemLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={itemLabel}
                accessibilityState={{ expanded: isDropdownOpen }}
                onPress={() => setIsDropdownOpen(open => !open)}
                className="flex-row items-center gap-2 rounded-xl border border-border-primary bg-white px-4 py-3"
              >
                <Text
                  className={cn(
                    'flex-1',
                    selectedItem ? 'text-label-primary' : 'text-label-tertiary',
                  )}
                  numberOfLines={1}
                >
                  {selectedItem ? selectedItem.name : itemPlaceholder}
                </Text>
                <Icon as={ChevronDown} className="size-4 text-label-tertiary" />
              </Pressable>
              <FieldError message={errors.itemId && errorMessages.required} />

              {isDropdownOpen ? (
                <View className="mt-1 overflow-hidden rounded-xl border border-border-primary bg-white">
                  {items.map(item => (
                    <Pressable
                      key={item.id}
                      testID={`item-option-${item.id}`}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: item.id === draft.itemId,
                      }}
                      onPress={() => {
                        onItemChange(item.id);
                        setIsDropdownOpen(false);
                      }}
                      className="flex-row items-center gap-2 border-b border-details-primary px-4 py-3"
                    >
                      <Text className="flex-1" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.id === draft.itemId ? (
                        <Icon
                          as={Check}
                          className="size-4 text-label-quartenery"
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
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
                <FieldError
                  message={errors.otherReason && errorMessages.required}
                />
              </View>
            ) : null}

            {failureMessage ? (
              <View className="rounded-xl border border-alert-primary bg-white p-3">
                <Text className="text-sm text-alert-primary">
                  {failureMessage}
                </Text>
              </View>
            ) : null}

            <Button
              shape="pill"
              onPress={onSubmit}
              disabled={isSaving}
              className="mt-2 h-12"
            >
              <Text>{saveLabel}</Text>
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export { OutputAdjustmentModal };
export type { OutputAdjustmentModalProps };

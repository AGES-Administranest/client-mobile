import { Check } from 'lucide-react-native';
import { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from 'app/components/ui/button';
import { CategoryFilter } from 'app/components/ui/CategoryFilter';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';
import { LabelTertiary } from 'theme/colors';

import type { FixedCostCategory } from '../domain/fixedCost';
import type {
  FixedCostDraft,
  FixedCostField,
} from '../domain/validateFixedCostForm';

export type FixedCostFormTexts = {
  title: string;
  editTitle: string;
  confirm: string;
  saving: string;
  deactivate: string;
  deactivating: string;
  deactivateConfirmTitle: string;
  deactivateConfirmMessage: string;
  close: string;
  cancel: string;
  labels: {
    description: string;
    monthlyAmount: string;
    category: string;
  };
  placeholders: {
    description: string;
    monthlyAmount: string;
  };
  errors: Partial<
    Record<Exclude<FixedCostField, 'category'> | 'category', string>
  >;
  categoryOptions: { value: FixedCostCategory; label: string }[];
};

export type FixedCostFormSheetProps = {
  visible: boolean;
  isEditing: boolean;
  draft: FixedCostDraft;
  isSaving: boolean;
  isDeactivating: boolean;
  failureText: string | null;
  texts: FixedCostFormTexts;
  onChangeText: (
    field: Exclude<FixedCostField, 'category'>,
    value: string,
  ) => void;
  onChangeCategory: (category: FixedCostCategory) => void;
  onSubmit: () => void;
  onDeactivate: () => void;
  onClose: () => void;
};

export function FixedCostFormSheet({
  visible,
  isEditing,
  draft,
  isSaving,
  isDeactivating,
  failureText,
  texts,
  onChangeText,
  onChangeCategory,
  onSubmit,
  onDeactivate,
  onClose,
}: FixedCostFormSheetProps) {
  const sheet = useSheetAnimation(visible, onClose);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  return (
    <>
      <Modal
        visible={sheet.isRendered}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: sheet.progress }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.close}
              onPress={onClose}
              className="flex-1 bg-background-shade"
            />
          </Animated.View>

          <Animated.View {...sheet.panHandlers} style={sheet.sheetStyle}>
            <View className="shrink gap-3 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4">
              <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-label-primary">
                  {isEditing ? texts.editTitle : texts.title}
                </Text>
                {isEditing ? (
                  <Pressable
                    onPress={() => setConfirmingDeactivate(true)}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Text className="text-sm font-semibold text-label-quartenery">
                      {isDeactivating ? texts.deactivating : texts.deactivate}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="h-px bg-details-primary" />

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="pb-1"
              >
                <Field
                  label={texts.labels.description}
                  placeholder={texts.placeholders.description}
                  value={draft.description}
                  error={texts.errors.description}
                  onChangeText={value => onChangeText('description', value)}
                />
                <Field
                  label={texts.labels.monthlyAmount}
                  placeholder={texts.placeholders.monthlyAmount}
                  value={draft.monthlyAmount}
                  error={texts.errors.monthlyAmount}
                  keyboardType="decimal-pad"
                  onChangeText={value => onChangeText('monthlyAmount', value)}
                />

                <Text className="mb-2 text-xs font-semibold uppercase text-label-primary">
                  {texts.labels.category}
                </Text>
                <CategoryFilter
                  options={texts.categoryOptions}
                  value={draft.category ?? ''}
                  onValueChange={value =>
                    onChangeCategory(value as FixedCostCategory)
                  }
                  bordered={false}
                  className="mb-1"
                />
                {texts.errors.category ? (
                  <Text className="mb-3 mt-1 text-xs text-alert-primary">
                    {texts.errors.category}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}
              </ScrollView>

              {failureText ? (
                <Text className="text-sm text-alert-primary">
                  {failureText}
                </Text>
              ) : null}

              <Button
                icon={Check}
                shape="pill"
                className="h-[49px] w-full"
                disabled={isSaving}
                onPress={onSubmit}
              >
                <Text className="font-semibold text-label-secondary">
                  {isSaving ? texts.saving : texts.confirm}
                </Text>
              </Button>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmSheet
        visible={confirmingDeactivate}
        title={texts.deactivateConfirmTitle}
        message={texts.deactivateConfirmMessage}
        confirmLabel={texts.deactivate}
        cancelLabel={texts.cancel}
        onConfirm={() => {
          setConfirmingDeactivate(false);
          onDeactivate();
        }}
        onCancel={() => setConfirmingDeactivate(false)}
      />
    </>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'decimal-pad';
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-semibold uppercase text-label-primary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className={
          error
            ? 'rounded-xl border border-alert-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
            : 'rounded-xl border border-border-primary bg-white px-4 py-2.5 text-[15px] text-label-primary'
        }
        placeholder={placeholder}
        placeholderTextColor={LabelTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
      {error ? (
        <Text className="mt-1 text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

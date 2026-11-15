import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  BOTTOM_SHEET_PORTAL_HOST,
  BottomSheet,
} from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { FormField } from 'app/components/ui/form-field';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import type { Sex } from '../domain/profile';
import type {
  ProfileFormField,
  ProfileFormValues,
} from '../domain/validateProfileForm';
import type { EditProfileTextField } from '../hooks/useEditProfileForm';

const DATE_MAX_LENGTH = 10;
const CRMV_MAX_LENGTH = 9;

const WEB_ABOVE_MODAL_Z_INDEX = Platform.OS === 'web' ? 10000 : undefined;

export type SelectOption = { value: string; label: string };

export type EditProfileTexts = {
  title: string;
  close: string;
  save: string;
  cancel: string;
  emailHint: string;
  labels: Record<ProfileFormField | 'email', string>;
  placeholders: Record<ProfileFormField, string>;
};

type EditProfileSheetProps = {
  visible: boolean;
  texts: EditProfileTexts;
  email: string;
  values: ProfileFormValues;
  errors: Partial<Record<ProfileFormField, string>>;
  sexOptions: SelectOption[];
  stateOptions: SelectOption[];
  submitError: string | null;
  canSave: boolean;
  isSaving: boolean;
  onChangeText: (field: EditProfileTextField, text: string) => void;
  onChangeSex: (sex: Sex) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function EditProfileSheet({
  visible,
  texts,
  email,
  values,
  errors,
  sexOptions,
  stateOptions,
  submitError,
  canSave,
  isSaving,
  onChangeText,
  onChangeSex,
  onSave,
  onCancel,
}: EditProfileSheetProps) {
  const field = (name: EditProfileTextField) => ({
    label: texts.labels[name],
    value: values[name],
    placeholder: texts.placeholders[name],
    error: errors[name],
    onChangeText: (text: string) => onChangeText(name, text),
  });

  return (
    <BottomSheet
      visible={visible}
      title={texts.title}
      closeLabel={texts.close}
      onClose={onCancel}
      footer={
        <View className="gap-3">
          {submitError ? (
            <NoticeBanner tone="alert" message={submitError} />
          ) : null}
          <Button
            icon={Check}
            shape="pill"
            className="h-[49px] w-full"
            disabled={!canSave}
            onPress={onSave}
          >
            <Text className="font-medium">{texts.save}</Text>
          </Button>
          <Text
            accessibilityRole="button"
            onPress={isSaving ? undefined : onCancel}
            className="self-center py-1 text-[15px] font-semibold text-label-quartenery"
          >
            {texts.cancel}
          </Text>
        </View>
      }
    >
      <FormField {...field('name')} />
      <FormField {...field('crmv')} maxLength={CRMV_MAX_LENGTH} />
      <View className="gap-1">
        <FormField label={texts.labels.email} value={email} />
        <Text className="text-[11px] text-label-tertiary">
          {texts.emailHint}
        </Text>
      </View>
      <FormField
        {...field('birthDate')}
        keyboardType="number-pad"
        maxLength={DATE_MAX_LENGTH}
      />
      <SelectField
        label={texts.labels.sex}
        placeholder={texts.placeholders.sex}
        value={values.sex}
        options={sexOptions}
        onChange={value => onChangeSex(value as Sex)}
      />
      <View className="flex-row gap-2.5">
        <FormField {...field('city')} className="flex-1" />
        <SelectField
          label={texts.labels.state}
          placeholder={texts.placeholders.state}
          value={values.state}
          options={stateOptions}
          error={errors.state}
          onChange={value => onChangeText('state', value)}
          className="w-[110px]"
        />
      </View>
    </BottomSheet>
  );
}

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  error?: string;
  onChange: (value: string) => void;
  className?: string;
};

function SelectField({
  label,
  placeholder,
  value,
  options,
  error,
  onChange,
  className,
}: SelectFieldProps) {
  const [width, setWidth] = useState(0);
  const selected = options.find(option => option.value === value);

  return (
    <View className={cn('gap-1', className)}>
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
        {label}
      </Text>
      <SelectPrimitive.Root
        value={selected}
        onValueChange={option => option && onChange(option.value)}
      >
        <SelectPrimitive.Trigger
          aria-label={label}
          onLayout={event => setWidth(event.nativeEvent.layout.width)}
          className={cn(
            'flex-row items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5',
            error ? 'border-alert-primary' : 'border-border-primary',
          )}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className={cn(
              'shrink text-sm',
              selected ? 'text-label-primary' : 'text-label-placeholder',
            )}
          />
          <Icon as={ChevronDown} size={16} className="text-label-tertiary" />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal hostName={BOTTOM_SHEET_PORTAL_HOST}>
          <SelectPrimitive.Overlay style={StyleSheet.absoluteFill}>
            <SelectPrimitive.Content
              sideOffset={4}
              style={{ width, zIndex: WEB_ABOVE_MODAL_Z_INDEX }}
              className="max-h-64 overflow-hidden rounded-xl border border-border-primary bg-white"
            >
              <SelectPrimitive.Viewport>
                <ScrollView>
                  {options.map(option => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      className={cn(
                        'flex-row items-center justify-between border-b border-details-primary px-3 py-2.5',
                        option.value === value && 'bg-details-primary',
                      )}
                    >
                      <SelectPrimitive.ItemText className="text-sm text-label-primary" />
                      <SelectPrimitive.ItemIndicator>
                        <Icon
                          as={Check}
                          size={16}
                          className="text-label-quartenery"
                        />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </ScrollView>
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Overlay>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <Text className="text-xs text-alert-primary">{error}</Text>
      ) : null}
    </View>
  );
}

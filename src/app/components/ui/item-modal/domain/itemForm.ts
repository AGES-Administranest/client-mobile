import { z } from 'zod';

import {
  currencyToNumber,
  digitsOnly,
  isPastDate,
  parseDateInput,
} from './itemModal';

export type ItemFormValues = {
  name: string;
  unitCost: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  expiration: string;
  supplierName: string;
};

export type ItemFormField = keyof ItemFormValues;

export type ItemFormFlags = {
  isEditing: boolean;
  hasChosenItem: boolean;
  isAddingToExisting: boolean;
  showMinQuantity: boolean;
  showExpiration: boolean;
  showSupplier: boolean;
};

type ItemFormErrorCodes = {
  name: 'required' | 'tooShort' | 'pickOrAdd';
  unitCost: 'required' | 'tooLarge';
  unit: 'required';
  quantity: 'required' | 'zero' | 'tooLarge';
  minQuantity: 'tooLarge';
  expiration: 'incomplete' | 'invalid' | 'past';
  supplierName: 'tooShort';
};

export type ItemFormErrors = {
  [Field in ItemFormField]?: ItemFormErrorCodes[Field];
};

const NAME_MIN_LENGTH = 2;
const SUPPLIER_MIN_LENGTH = 2;
export const MAX_QUANTITY = 999_999;
export const MAX_UNIT_COST = 999_999.99;

function createItemFormSchema(flags: ItemFormFlags) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'required')
      .min(NAME_MIN_LENGTH, 'tooShort')
      .refine(() => flags.hasChosenItem, 'pickOrAdd'),
    unitCost: z
      .string()
      .refine(value => digitsOnly(value) !== '', 'required')
      .refine(value => currencyToNumber(value) <= MAX_UNIT_COST, 'tooLarge'),
    unit: z.string().trim().min(1, 'required'),
    quantity: z.string().superRefine((value, context) => {
      if (flags.isEditing) return;
      if (value === '') {
        if (flags.isAddingToExisting) {
          context.addIssue({ code: 'custom', message: 'required' });
        }
        return;
      }
      const quantity = Number(value);
      if (flags.isAddingToExisting && quantity === 0) {
        context.addIssue({ code: 'custom', message: 'zero' });
      } else if (quantity > MAX_QUANTITY) {
        context.addIssue({ code: 'custom', message: 'tooLarge' });
      }
    }),
    minQuantity: z
      .string()
      .refine(
        value =>
          !flags.showMinQuantity ||
          value === '' ||
          Number(value) <= MAX_QUANTITY,
        'tooLarge',
      ),
    expiration: z.string().superRefine((value, context) => {
      if (!flags.showExpiration || value === '') return;
      if (digitsOnly(value).length !== 8) {
        context.addIssue({ code: 'custom', message: 'incomplete' });
      } else if (parseDateInput(value) === null) {
        context.addIssue({ code: 'custom', message: 'invalid' });
      } else if (isPastDate(value)) {
        context.addIssue({ code: 'custom', message: 'past' });
      }
    }),
    supplierName: z
      .string()
      .trim()
      .refine(
        value =>
          !flags.showSupplier ||
          value === '' ||
          value.length >= SUPPLIER_MIN_LENGTH,
        'tooShort',
      ),
  });
}

export function validateItemForm(
  values: ItemFormValues,
  flags: ItemFormFlags,
): ItemFormErrors {
  const result = createItemFormSchema(flags).safeParse(values);
  const errors: Partial<Record<ItemFormField, string>> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ItemFormField;
      errors[field] ??= issue.message;
    }
  }

  return errors as ItemFormErrors;
}

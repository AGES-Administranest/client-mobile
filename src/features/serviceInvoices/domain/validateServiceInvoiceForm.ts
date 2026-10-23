import { isPtBrAmount } from 'shared/utils/amount';
import { currencyToNumber, parseDateInput } from 'shared/utils/inputMasks';

import type {
  ServiceInvoiceErrors,
  ServiceInvoiceFormValues,
  ServiceInvoiceInput,
} from './serviceInvoice.types';

export type ServiceInvoiceValidation = {
  errors: ServiceInvoiceErrors;
  input: ServiceInvoiceInput | null;
};

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function toIsoDate(masked: string): string | null {
  if (!parseDateInput(masked)) return null;
  const [day, month, year] = masked
    .replace(/\D/g, '')
    .match(/^(\d{2})(\d{2})(\d{4})$/)!
    .slice(1);
  return `${year}-${month}-${day}`;
}

export function validateServiceInvoiceForm(
  values: ServiceInvoiceFormValues,
  today: Date = new Date(),
): ServiceInvoiceValidation {
  const errors: ServiceInvoiceErrors = {};

  const issueDateText = values.issueDate.trim();
  const issueDate = issueDateText === '' ? null : toIsoDate(issueDateText);
  if (issueDateText === '') errors.issueDate = 'required';
  else if (!issueDate) errors.issueDate = 'invalid';
  else if (parseDateInput(issueDateText)!.getTime() > startOfDay(today)) {
    errors.issueDate = 'future';
  }

  const amountText = values.amount.trim();
  let amount: number | null = null;
  if (amountText === '') {
    errors.amount = 'required';
  } else if (!isPtBrAmount(amountText)) {
    errors.amount = 'invalid';
  } else {
    amount = currencyToNumber(amountText);
    if (amount <= 0) {
      errors.amount = 'mustBePositive';
      amount = null;
    }
  }

  if (!values.clientId) errors.clientId = 'required';

  if (Object.keys(errors).length > 0) return { errors, input: null };

  const number = values.number.trim();
  return {
    errors,
    input: {
      issueDate: issueDate!,
      amount: amount!,
      clientId: values.clientId!,
      ...(number !== '' ? { number } : {}),
    },
  };
}

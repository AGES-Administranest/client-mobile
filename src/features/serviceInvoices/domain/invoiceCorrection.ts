import { formatCurrencyInput } from 'shared/utils/inputMasks';

import { isoToDateInput } from './extractionToFormValues';
import type {
  ServiceInvoiceErrors,
  ServiceInvoiceFormValues,
} from './serviceInvoice.types';
import type {
  ServiceInvoiceCorrectionInput,
  ServiceInvoiceCorrectionValues,
  ServiceInvoiceRecord,
} from './serviceInvoiceRecord.types';
import { validateServiceInvoiceForm } from './validateServiceInvoiceForm';

export function toCorrectionValues(
  record: ServiceInvoiceRecord,
): ServiceInvoiceCorrectionValues {
  return {
    issueDate: isoToDateInput(record.issueDate),
    amount: formatCurrencyInput(String(Math.round(record.amount * 100))),
    number: record.number ?? '',
    clientId: record.clientId,
    location: record.location ?? '',
  };
}

export type CorrectionValidation = {
  errors: ServiceInvoiceErrors;
  input: ServiceInvoiceCorrectionInput | null;
};

export function validateCorrection(
  values: ServiceInvoiceFormValues,
  location: string,
): CorrectionValidation {
  const { errors, input } = validateServiceInvoiceForm(values);
  if (!input) return { errors, input: null };

  const trimmedLocation = location.trim();
  return {
    errors,
    input: {
      issueDate: input.issueDate,
      amount: input.amount,
      clientId: input.clientId,
      location: trimmedLocation === '' ? null : trimmedLocation,
    },
  };
}

import { formatCurrencyInput } from 'shared/utils/inputMasks';

import {
  EMPTY_SERVICE_INVOICE_FORM,
  type ServiceInvoiceExtraction,
  type ServiceInvoiceFormValues,
} from './serviceInvoice.types';

export type InitialReview = {
  values: ServiceInvoiceFormValues;
  /** The reading failed: the person fills everything in by hand. */
  readFailed: boolean;
};

function isoToDateInput(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function amountToInput(amount: number): string {
  return amount > 0
    ? formatCurrencyInput(String(Math.round(amount * 100)))
    : '';
}

/**
 * A reading that worked fills the fields it found; a failed one (or none at
 * all, as when the request itself broke) leaves them empty. The taker is not
 * linked here: choosing it stays with the person.
 */
export function toInitialReview(
  extraction: ServiceInvoiceExtraction | null,
): InitialReview {
  if (!extraction || extraction.status === 'FAILED') {
    return { values: EMPTY_SERVICE_INVOICE_FORM, readFailed: true };
  }

  return {
    values: {
      issueDate: extraction.issueDate
        ? isoToDateInput(extraction.issueDate)
        : '',
      amount: extraction.amount ? amountToInput(extraction.amount) : '',
      number: extraction.number?.trim() ?? '',
      clientId: null,
    },
    readFailed: false,
  };
}

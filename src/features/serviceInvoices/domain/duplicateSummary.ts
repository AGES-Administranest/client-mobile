import { formatCurrency } from 'shared/utils/currency';

import { isoToDateInput } from './extractionToFormValues';
import type { ServiceInvoiceDuplicate } from './serviceInvoice.types';

const LOCALE = 'pt-BR';

export type DuplicateSummary = {
  number: string;
  issueDate: string;
  amount: string;
  clientName: string;
};

export function toDuplicateSummary(
  duplicate: ServiceInvoiceDuplicate,
): DuplicateSummary {
  return {
    number: duplicate.number?.trim() ?? '',
    issueDate: isoToDateInput(duplicate.issueDate) || duplicate.issueDate,
    amount: formatCurrency(duplicate.amount, LOCALE),
    clientName: duplicate.clientName,
  };
}

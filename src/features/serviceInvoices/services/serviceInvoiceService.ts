import type { PickedPdf } from 'shared/services/pdfPicker';

import type {
  ServiceInvoiceExtraction,
  ServiceInvoiceInput,
} from '../domain/serviceInvoice.types';

// STAND-IN: the NFSe upload, extraction and confirmation endpoints are still
// pending in the backend (US01). The signatures are the ones the real calls
// will have (token first, the file or the input second), so the swap is one
// line per function.
//
// To exercise every path by hand, the file name decides the outcome:
//   "...falha..." / "...fail..."       -> the reading fails
//   "...parcial..." / "...partial..."  -> only the issue date comes back
//   anything else                      -> a full reading
const STAND_IN_DELAY_MS = 900;

function settle<T>(value: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), STAND_IN_DELAY_MS);
  });
}

export function extractServiceInvoice(
  _idToken: string,
  file: PickedPdf,
): Promise<ServiceInvoiceExtraction> {
  if (/falha|fail/i.test(file.name)) {
    return settle({ status: 'FAILED' });
  }
  if (/parcial|partial/i.test(file.name)) {
    return settle({ status: 'PARTIAL', issueDate: '2026-03-15' });
  }
  return settle({
    status: 'SUCCESS',
    issueDate: '2026-03-15',
    amount: 1850,
    number: '2026/0042',
    taker: { name: 'Clínica Veterinária Exemplo', taxId: '12345678000195' },
  });
}

export function confirmServiceInvoice(
  _idToken: string,
  _input: ServiceInvoiceInput,
): Promise<{ id: string }> {
  return settle({ id: `stand-in-${Date.now()}` });
}

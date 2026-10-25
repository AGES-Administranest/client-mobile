import type { PickedPdf } from 'shared/services/pdfPicker';

import type {
  ConfirmServiceInvoiceOptions,
  ExtractedClient,
  ServiceInvoiceConfirmation,
  ServiceInvoiceExtraction,
  ServiceInvoiceInput,
  ServiceInvoiceSyncItem,
  ServiceInvoiceSyncResult,
  ServiceInvoiceUploadRequest,
  ServiceInvoiceUploadTarget,
} from '../domain/serviceInvoice.types';

// STAND-IN: the NFSe upload, extraction and confirmation endpoints are still
// pending in the backend (US01). The signatures are the ones the real calls
// will have (token first, the file or the input second), so the swap is one
// line per function.
//
// To exercise every path by hand, the file name decides the outcome:
//   "...falha..." / "...fail..."       -> the reading fails
//   "...parcial..." / "...partial..."  -> only the issue date comes back
//   "...vinculado..." / "...match..."  -> a full reading, taker linked
//   "...sugestao..." / "...suggestion..." -> a full reading, 2-3 suggested takers
//   "...novo..." / "...new..."         -> a full reading, taker not registered
//   "...duplicada..." / "...duplicate..." -> a linked taker, and the
//                                         confirmation reports a duplicate
//   anything else                      -> a full reading
// The takers below are made up: they do not exist in the backend, so linking
// one only works against the stand-in.
const STAND_IN_DELAY_MS = 900;

const FULL_READING: ServiceInvoiceExtraction = {
  status: 'SUCCESS',
  issueDate: '2026-03-15',
  amount: 1850,
  number: '2026/0042',
  taker: { name: 'Clínica Veterinária Exemplo', taxId: '12345678000195' },
};

const LINKED_CLIENT: ExtractedClient = {
  id: 'stand-in-client-1',
  name: 'Clínica Veterinária Exemplo',
  taxId: '12345678000195',
};

const SUGGESTED_CLIENTS: ExtractedClient[] = [
  LINKED_CLIENT,
  {
    id: 'stand-in-client-2',
    name: 'Clínica Veterinária Exemplo Norte',
    taxId: '12345678000276',
  },
  {
    id: 'stand-in-client-3',
    name: 'Pet Center Exemplo',
    taxId: '98765432000110',
  },
];

// The confirmation does not see the file, so the duplicate scenario reads an
// amount no real note has: confirming that value reports a duplicate, and
// editing it makes the note ordinary again, as with a real value-and-date check.
const DUPLICATE_AMOUNT = 7777.77;

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
  if (/duplicada|duplicate/i.test(file.name)) {
    return settle({
      ...FULL_READING,
      amount: DUPLICATE_AMOUNT,
      clientMatch: LINKED_CLIENT,
    });
  }
  if (/vinculado|match/i.test(file.name)) {
    return settle({ ...FULL_READING, clientMatch: LINKED_CLIENT });
  }
  if (/sugestao|suggestion/i.test(file.name)) {
    return settle({ ...FULL_READING, clientSuggestions: SUGGESTED_CLIENTS });
  }
  if (/novo|new/i.test(file.name)) {
    return settle({
      ...FULL_READING,
      taker: { name: 'Clínica Nova Exemplo', taxId: '45723174000110' },
    });
  }
  return settle(FULL_READING);
}

export function confirmServiceInvoice(
  _idToken: string,
  input: ServiceInvoiceInput,
  { allowDuplicate = false }: ConfirmServiceInvoiceOptions = {},
): Promise<ServiceInvoiceConfirmation> {
  if (input.amount === DUPLICATE_AMOUNT && !allowDuplicate) {
    return settle({
      duplicateOf: {
        id: 'stand-in-invoice-0',
        number: '2026/0031',
        issueDate: input.issueDate,
        amount: input.amount,
        clientName: 'Clínica Veterinária Exemplo',
      },
    });
  }
  return settle({ id: `stand-in-${Date.now()}` });
}

// STAND-IN for the offline sync. Backend #71 has the upload (`upload-url`, then
// the POST to the bucket) but no /service-invoices/sync yet, and its
// `/uploaded` reads the PDF, so a note typed by hand never calls it.
const REFUSED_NUMBER = 'erro';
const DIFFERENT_READING_NUMBER = 'leitura';

export function requestServiceInvoiceUpload(
  _idToken: string,
  invoiceId: string,
  request: ServiceInvoiceUploadRequest,
): Promise<ServiceInvoiceUploadTarget> {
  return settle({
    url: 'https://stand-in.invalid/bucket',
    fields: {
      key: `stand-in/${invoiceId}/original`,
      'Content-Type': request.fileMimeType,
    },
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function sendServiceInvoicePdf(
  _target: ServiceInvoiceUploadTarget,
  _bytes: Uint8Array,
): Promise<void> {
  return settle(undefined);
}

/**
 * The scenarios come from the note's number: "erro" is refused, "leitura"
 * comes back with a reading that differs from what was typed, and anything
 * else is applied, with the id of the income entry the backend would record.
 */
export function syncServiceInvoices(
  _idToken: string,
  items: ServiceInvoiceSyncItem[],
): Promise<ServiceInvoiceSyncResult[]> {
  return settle(
    items.map((item): ServiceInvoiceSyncResult => {
      if (item.number === REFUSED_NUMBER) {
        return {
          id: item.id,
          status: 'conflict',
          code: 'SERVICE_INVOICE_SYNC_REJECTED',
        };
      }
      return {
        id: item.id,
        status: 'applied',
        financialEntryId: `stand-in-entry-${item.id}`,
        ...(item.number === DIFFERENT_READING_NUMBER
          ? { reading: { amount: item.amount + 100 } }
          : {}),
      };
    }),
  );
}

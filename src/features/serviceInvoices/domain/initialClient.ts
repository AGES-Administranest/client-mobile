import type {
  ExtractedClient,
  ServiceInvoiceExtraction,
} from './serviceInvoice.types';

export type InitialClient = {
  selected: ExtractedClient | null;
  suggestions: ExtractedClient[];
};

export type NewClientPrefill = { name: string; taxId: string };

/**
 * A linked taker wins over suggestions: once the API is sure, listing
 * alternatives only invites a wrong pick. A failed reading links nothing.
 */
export function resolveInitialClient(
  extraction: ServiceInvoiceExtraction | null,
): InitialClient {
  if (!extraction || extraction.status === 'FAILED') {
    return { selected: null, suggestions: [] };
  }
  if (extraction.clientMatch) {
    return { selected: extraction.clientMatch, suggestions: [] };
  }
  return { selected: null, suggestions: extraction.clientSuggestions ?? [] };
}

export function toNewClientPrefill(
  extraction: ServiceInvoiceExtraction | null,
): NewClientPrefill {
  if (!extraction || extraction.status === 'FAILED') {
    return { name: '', taxId: '' };
  }
  return {
    name: extraction.taker?.name?.trim() ?? '',
    taxId: extraction.taker?.taxId?.trim() ?? '',
  };
}

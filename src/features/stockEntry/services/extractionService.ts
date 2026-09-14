import type { ScannedItem } from '../domain/stockItem';

// What the backend's extraction will hand back for a document — the shape of
// a real invoice, so the review sheet can be exercised end to end. Nothing
// here leaves the phone: the extraction endpoint (US10 §3.3) is not wired yet,
// and this is what stands in for it until it is.
//
// The last item is deliberately broken (no quantity) so the review shows the
// "check this one" state, which is the whole reason the sheet is editable.
const EXTRACTED_ITEMS: ScannedItem[] = [
  {
    id: 'item-1',
    name: 'PROPOFOL 10MG/ML F/A 20ML',
    quantity: 5,
    unit: 'FA',
  },
  {
    id: 'item-2',
    name: 'CETAMINA 10% 50ML',
    quantity: 2,
    unit: 'FA',
  },
  {
    id: 'item-3',
    name: 'SERINGA 60ML CX 30UN',
    quantity: 0,
    unit: 'CX',
  },
];

/** The items read from the document already in the bucket (ADR-09 id). */
export async function fetchExtractedItems(
  _invoiceId: string,
): Promise<ScannedItem[]> {
  return Promise.resolve(EXTRACTED_ITEMS);
}

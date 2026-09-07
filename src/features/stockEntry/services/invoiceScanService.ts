import { extractPdfRows } from './pdfTextExtractor';
import { parseInvoiceRows, parseInvoiceText } from '../domain/parseInvoice';
import { ScannedItem } from '../domain/stockItem';

/** Why an extraction could not produce items — mapped to a message in the UI. */
export type ScanFailure =
  | 'noTextLayer'
  | 'noItems'
  | 'ocrUnavailable'
  | 'permissionDenied';

export class ScanError extends Error {
  constructor(public readonly reason: ScanFailure) {
    super(reason);
    this.name = 'ScanError';
  }
}

/**
 * Turns visual rows into items. Tries the column-aware parser first, since
 * knowing where a cell ends is what prevents a unit-like token inside a
 * description from being read as the unit column. Falls back to flat-line
 * parsing, because OCR sometimes merges a whole invoice row into one line.
 */
export function extractItemsFromRows(rows: string[][]): ScannedItem[] {
  const fromColumns = parseInvoiceRows(rows);
  if (fromColumns.length > 0) {
    return fromColumns;
  }

  return parseInvoiceText(rows.map(row => row.join(' ')).join('\n'));
}

/**
 * Reads a digitally generated PDF. No OCR involved: the invoice's own text
 * layer is extracted, which makes this path exact rather than best-effort.
 */
export function extractItemsFromPdf(bytes: Uint8Array): ScannedItem[] {
  const rows = extractPdfRows(bytes);

  // A scanned/photographed PDF has no text layer — it would need real OCR.
  if (rows.length === 0) {
    throw new ScanError('noTextLayer');
  }

  const items = extractItemsFromRows(rows);
  if (items.length === 0) {
    throw new ScanError('noItems');
  }

  return items;
}

/** Turns rows recognised from a photo into items. */
export function extractItemsFromPhotoRows(rows: string[][]): ScannedItem[] {
  const items = extractItemsFromRows(rows);
  if (items.length === 0) {
    throw new ScanError('noItems');
  }
  return items;
}

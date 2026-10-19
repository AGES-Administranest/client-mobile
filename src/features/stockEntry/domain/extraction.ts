import type { BackendItem } from 'features/materials';

/** The `extraction` block of `POST /stock-entries/:id/uploaded`. */
export type Extraction = {
  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'SUCCESS'
    | 'FAILED'
    | 'MANUAL'
    | 'CANCELLED_ORPHAN';
  failureReason?:
    | 'UNREADABLE'
    | 'NO_TABLE_FOUND'
    | 'TIMEOUT'
    | 'UNSUPPORTED_FORMAT'
    | 'NO_TEXT_LAYER';
  supplierId?: string;
  supplier?: { cnpj?: string; name?: string };
  invoiceNumber?: string;
  orderDate?: string;
  totalAmount?: number;
  items: ExtractedLine[];
  partial?: { pagesRead: number; totalPages: number };
};

export type ExtractedLine = {
  extractedDescription: string;
  quantity?: number;
  unitValue?: number;
  totalValue?: number;
  arithmeticCheck: boolean;
  match: LineMatch;
};

export type LineMatch = {
  decision: 'linked' | 'preselected' | 'suggested' | 'none';
  itemId?: string;
  reason?: 'ALIAS' | 'FUZZY';
  confidence?: number;
  candidates: MatchCandidate[];
};

export type MatchCandidate = {
  itemId: string;
  name: string;
  unit: BackendItem['unit'];
  score: number;
};

/** Why a document came back without lines to review. */
export type ReadingFailure =
  | 'photo'
  | 'noTextLayer'
  | 'noTableFound'
  | 'timeout'
  | 'unreadable';

export function readingFailure(extraction: Extraction): ReadingFailure | null {
  switch (extraction.status) {
    case 'SUCCESS':
      return null;
    case 'MANUAL':
      return 'photo';
    case 'FAILED':
      return failureOf(extraction.failureReason);
    // Another request is still reading it, which the app never does on its own.
    default:
      return 'unreadable';
  }
}

export function failureOf(reason: Extraction['failureReason']): ReadingFailure {
  switch (reason) {
    case 'NO_TEXT_LAYER':
      return 'noTextLayer';
    case 'NO_TABLE_FOUND':
      return 'noTableFound';
    case 'TIMEOUT':
      return 'timeout';
    default:
      return 'unreadable';
  }
}

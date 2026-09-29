import type { BackendItem } from 'features/materials';

import {
  failureOf,
  type Extraction,
  type MatchCandidate,
  type ReadingFailure,
} from './extraction';

/** A pending entry, as `GET /stock-entries` lists it. */
export type DraftSummary = {
  id: string;
  fileName?: string;
  fileMimeType?: string;
  supplierName?: string;
  invoiceNumber?: string;
  orderDate?: string;
  totalAmount?: number;
  extractionStatus: Extraction['status'];
  failureReason?: Extraction['failureReason'];
  uploadedAt?: string;
  updatedAt: string;
};

/** `GET /stock-entries/:id`: the reading and the review as last saved. */
export type DraftDetail = {
  id: string;
  fileName?: string;
  fileMimeType?: string;
  extraction: Extraction;
  lines: SavedLine[];
};

export type SavedLine = {
  sourceIndex?: number;
  description: string;
  item?: { id: string; name: string; unit: BackendItem['unit'] };
  quantity?: number;
  unitCost?: number;
  totalValue?: number;
  lotNumber?: string;
  expirationDate?: string;
  candidates: MatchCandidate[];
};

/** A line as `PUT /stock-entries/:id/items` takes it. */
export type LineInput = Omit<SavedLine, 'item' | 'candidates'> & {
  itemId?: string;
};

/** `PATCH /stock-entries/:id`: an absent field is kept, `null` clears it. */
export type HeaderInput = {
  invoiceNumber?: string | null;
  orderDate?: string | null;
  totalAmount?: number | null;
};

export type EntryStatus =
  | 'ready'
  | 'processing'
  | 'failed'
  | 'photo'
  | 'notUploaded';

/** The status the list shows (US10 §11.2). */
export function entryStatus(draft: DraftSummary): EntryStatus {
  switch (draft.extractionStatus) {
    case 'SUCCESS':
      return 'ready';
    case 'FAILED':
      return 'failed';
    case 'MANUAL':
      return 'photo';
    case 'PENDING':
    case 'PROCESSING':
      return draft.uploadedAt ? 'processing' : 'notUploaded';
    default:
      return 'notUploaded';
  }
}

export function entryFailure(draft: DraftSummary): ReadingFailure | null {
  return draft.extractionStatus === 'FAILED'
    ? failureOf(draft.failureReason)
    : null;
}

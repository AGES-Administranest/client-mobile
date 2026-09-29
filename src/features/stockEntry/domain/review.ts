import { toDayMonthYear, toIsoDate } from './dates';
import type { DraftDetail, HeaderInput, LineInput, SavedLine } from './draft';
import type {
  ExtractedLine,
  Extraction,
  LineMatch,
  MatchCandidate,
} from './extraction';

export type LinkedItem = {
  itemId: string;
  name: string;
  /** The line's quantity is counted in this unit (US10 §3.4). */
  unit: string | null;
};

export type ReviewLine = {
  id: string;
  /** The document line it came from; the parts of a split line share it. */
  sourceIndex: number | null;
  /** As printed on the document; empty on a line added by hand. */
  description: string;
  quantity: number | null;
  unitValue: number | null;
  /** The document's own line total, kept only while it disagrees. */
  printedTotal: number | null;
  link: LinkedItem | null;
  candidates: MatchCandidate[];
  lot: string;
  /** dd/mm/aaaa, as the field shows it. */
  expiry: string;
};

export type ReviewHeader = {
  supplierId: string | null;
  /** As read, for when none of the user's suppliers has that CNPJ. */
  supplierName: string | null;
  invoiceNumber: string;
  /** dd/mm/aaaa, as the field shows it. */
  orderDate: string;
  totalAmount: number | null;
};

export type Review = {
  header: ReviewHeader;
  lines: ReviewLine[];
  partial: { pagesRead: number; totalPages: number } | null;
};

export type LineIssue =
  | 'mismatch'
  | 'shortName'
  | 'unlinked'
  | 'noQuantity'
  | 'noUnitValue';

/** Red on screen; the rest are yellow. */
export const BLOCKING_ISSUES: readonly LineIssue[] = ['mismatch', 'unlinked'];

export type LineChanges = Partial<
  Pick<ReviewLine, 'quantity' | 'unitValue' | 'lot' | 'expiry'>
>;

export type HeaderChanges = Partial<
  Pick<ReviewHeader, 'invoiceNumber' | 'orderDate' | 'totalAmount'>
>;

export type UnitLabel = (unit: MatchCandidate['unit']) => string;

const SHORT_DESCRIPTION_LENGTH = 3;

/** A detail never saved starts from what was read. */
export function reviewFromDetail(
  detail: DraftDetail,
  unitLabel: UnitLabel,
): Review {
  return detail.lines.length > 0
    ? fromSaved(detail, unitLabel)
    : fromExtraction(detail.extraction, unitLabel);
}

export function fromExtraction(
  extraction: Extraction,
  unitLabel: UnitLabel,
): Review {
  return {
    header: headerOf(extraction),
    lines: extraction.items.map((line, index) =>
      fromExtractedLine(line, index, unitLabel),
    ),
    partial: extraction.partial ?? null,
  };
}

function fromSaved(detail: DraftDetail, unitLabel: UnitLabel): Review {
  return {
    header: headerOf(detail.extraction),
    lines: detail.lines.map((line, index) =>
      fromSavedLine(line, index, unitLabel),
    ),
    partial: detail.extraction.partial ?? null,
  };
}

function headerOf(extraction: Extraction): ReviewHeader {
  return {
    supplierId: extraction.supplierId ?? null,
    supplierName: extraction.supplier?.name ?? null,
    invoiceNumber: extraction.invoiceNumber ?? '',
    orderDate: extraction.orderDate ? toDayMonthYear(extraction.orderDate) : '',
    totalAmount: extraction.totalAmount ?? null,
  };
}

function fromExtractedLine(
  line: ExtractedLine,
  index: number,
  unitLabel: UnitLabel,
): ReviewLine {
  return reviewLine({
    id: `line-${index}`,
    sourceIndex: index,
    description: line.extractedDescription,
    quantity: line.quantity ?? null,
    unitValue: line.unitValue ?? null,
    printedTotal: line.arithmeticCheck ? null : line.totalValue ?? null,
    link: suggestedLink(line.match, unitLabel),
    candidates: line.match.candidates,
  });
}

function fromSavedLine(
  line: SavedLine,
  index: number,
  unitLabel: UnitLabel,
): ReviewLine {
  return reviewLine({
    id: `line-${index}`,
    sourceIndex: line.sourceIndex ?? null,
    description: line.description,
    quantity: line.quantity ?? null,
    unitValue: line.unitCost ?? null,
    printedTotal: line.totalValue ?? null,
    link: line.item
      ? {
          itemId: line.item.id,
          name: line.item.name,
          unit: unitLabel(line.item.unit),
        }
      : null,
    candidates: line.candidates,
    lot: line.lotNumber ?? '',
    expiry: line.expirationDate ? toDayMonthYear(line.expirationDate) : '',
  });
}

function reviewLine(
  fields: Pick<ReviewLine, 'id' | 'description'> & Partial<ReviewLine>,
): ReviewLine {
  return {
    sourceIndex: null,
    quantity: null,
    unitValue: null,
    printedTotal: null,
    link: null,
    candidates: [],
    lot: '',
    expiry: '',
    ...fields,
  };
}

function suggestedLink(
  match: LineMatch,
  unitLabel: UnitLabel,
): LinkedItem | null {
  if (!match.itemId) return null;
  const candidate = match.candidates.find(c => c.itemId === match.itemId);
  return {
    itemId: match.itemId,
    name: candidate?.name ?? '',
    unit: candidate ? unitLabel(candidate.unit) : null,
  };
}

export function toLinesInput(lines: readonly ReviewLine[]): LineInput[] {
  return lines.map(line => {
    const expirationDate = toIsoDate(line.expiry);
    return {
      ...(line.sourceIndex !== null && { sourceIndex: line.sourceIndex }),
      description: line.description,
      ...(line.link && { itemId: line.link.itemId }),
      ...(line.quantity !== null && { quantity: line.quantity }),
      ...(line.unitValue !== null && { unitCost: line.unitValue }),
      ...(line.printedTotal !== null && { totalValue: line.printedTotal }),
      ...(line.lot.trim() !== '' && { lotNumber: line.lot.trim() }),
      ...(expirationDate && { expirationDate }),
    };
  });
}

/** A date still being typed is left out rather than saved half-way. */
export function toHeaderInput(header: ReviewHeader): HeaderInput {
  const orderDate = header.orderDate.trim();
  const isoOrderDate = toIsoDate(orderDate);
  return {
    invoiceNumber: header.invoiceNumber.trim() || null,
    ...(orderDate === '' && { orderDate: null }),
    ...(isoOrderDate && { orderDate: isoOrderDate }),
    totalAmount: header.totalAmount,
  };
}

export function lineTotal(line: ReviewLine): number | null {
  return line.quantity !== null && line.unitValue !== null
    ? roundCents(line.quantity * line.unitValue)
    : null;
}

export function lineIssue(line: ReviewLine): LineIssue | null {
  if (hasMismatch(line)) return 'mismatch';
  if (!line.link) {
    const description = line.description.trim();
    return description !== '' && description.length <= SHORT_DESCRIPTION_LENGTH
      ? 'shortName'
      : 'unlinked';
  }
  if (line.quantity === null || line.quantity <= 0) return 'noQuantity';
  if (line.unitValue === null) return 'noUnitValue';
  return null;
}

// Same tolerance as the backend's arithmetic check: half a cent per unit,
// never under one cent.
function hasMismatch({ quantity, unitValue, printedTotal }: ReviewLine) {
  if (quantity === null || unitValue === null || printedTotal === null) {
    return false;
  }
  const tolerance = Math.max(0.01, 0.005 * Math.abs(quantity));
  return Math.abs(quantity * unitValue - printedTotal) > tolerance + 1e-9;
}

export function linesSum(lines: readonly ReviewLine[]): number {
  return roundCents(
    lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0),
  );
}

/** Document total minus the lines, or null when the total was not read. */
export function totalDifference(review: Review): number | null {
  const { totalAmount } = review.header;
  return totalAmount === null
    ? null
    : roundCents(totalAmount - linesSum(review.lines));
}

export function linesNeedingAttention(
  lines: readonly ReviewLine[],
): ReviewLine[] {
  return lines.filter(line => lineIssue(line) !== null);
}

/** Which lot of a split document line this is, or null when it is whole. */
export function splitPosition(
  lines: readonly ReviewLine[],
  line: ReviewLine,
): { part: number; of: number } | null {
  if (line.sourceIndex === null) return null;
  const parts = lines.filter(other => other.sourceIndex === line.sourceIndex);
  return parts.length > 1
    ? { part: parts.indexOf(line) + 1, of: parts.length }
    : null;
}

export function updateLine(
  lines: readonly ReviewLine[],
  id: string,
  changes: LineChanges,
): ReviewLine[] {
  return lines.map(line => (line.id === id ? { ...line, ...changes } : line));
}

/** Takes quantity × unit value as the line total, over the printed one. */
export function acceptComputedTotal(
  lines: readonly ReviewLine[],
  id: string,
): ReviewLine[] {
  return lines.map(line =>
    line.id === id ? { ...line, printedTotal: null } : line,
  );
}

export function linkLine(
  lines: readonly ReviewLine[],
  id: string,
  item: LinkedItem,
): ReviewLine[] {
  return lines.map(line => (line.id === id ? { ...line, link: item } : line));
}

export function removeLine(
  lines: readonly ReviewLine[],
  id: string,
): ReviewLine[] {
  return lines.filter(line => line.id !== id);
}

export function addLine(
  lines: readonly ReviewLine[],
  id: string,
): ReviewLine[] {
  return [...lines, reviewLine({ id, description: '' })];
}

/**
 * One document line received in more than one lot: the new part starts empty
 * so each lot gets its own quantity, lot number and expiry. The printed total
 * belongs to the whole line, so neither part keeps it.
 */
export function splitLine(
  lines: readonly ReviewLine[],
  id: string,
  newId: string,
): ReviewLine[] {
  const index = lines.findIndex(line => line.id === id);
  if (index < 0) return [...lines];

  const source = lines[index];
  const first: ReviewLine = { ...source, printedTotal: null };
  const second: ReviewLine = {
    ...first,
    id: newId,
    quantity: null,
    lot: '',
    expiry: '',
  };

  return [...lines.slice(0, index), first, second, ...lines.slice(index + 1)];
}

export function updateHeader(
  header: ReviewHeader,
  changes: HeaderChanges,
): ReviewHeader {
  return { ...header, ...changes };
}

/** pt-BR: "1.234,5" is 1234.5. Empty or not a number is null. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

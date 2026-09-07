import { ScannedItem } from './stockItem';

/**
 * Unit-of-measure codes used by the suppliers' invoices/quotes. The unit column
 * is the anchor for parsing: everything before it is the description, the
 * integer right after it is the quantity, and every value after that is money.
 */
const UNIT_CODES = new Set([
  'AM', // ampola
  'FA', // frasco-ampola
  'FR', // frasco
  'UN', // unidade
  'BS', // bolsa
  'CX', // caixa
  'CJ', // conjunto
  'PC', // pacote
  'PT', // pote
  'RL', // rolo
  'TB', // tubo
  'KT', // kit
  'EN', // envelope
  'GL', // galão
  'LT', // litro
  'KG',
  'MC',
  'PA',
  'SC',
  'VD',
  'BL',
  'SR',
]);

// Money always carries a decimal comma ("7,3135"); quantities never do. This is
// what lets us tell the quantity column apart from the price columns.
const MONEY = /^\d[\d.]*,\d+$/;
const INTEGER = /^\d+$/;

// Matches "<UNIT> <QUANTITY> " immediately followed by a money value — used for
// flat OCR text, where the columns are not available as separate cells.
const TAIL = /\b([A-Z]{2,3})\s+(\d+)\s+(?=\d[\d.]*,\d)/g;

// Supplier classification suffixes, e.g. "(C1)", "(A1)", "( A1 )".
const CLASSIFICATION = /\(\s*[A-C]\d\s*\)/g;
// Leading catalogue/sequence codes, e.g. "000002 02 20052 ".
const LEADING_CODES = /^(?:\d{2,}\s+)+/;
// Veterinary marker used by one of the suppliers.
const VET_PREFIX = /^\*+\s*VET\s*/i;
// Vendor tail: a dash followed by whitespace ("… RADIOPACO - NIPRO",
// "… C/PVC- JP"). Written so it never splits "1-1/4".
const VENDOR_TAIL = /-\s+\S.*$/;

/**
 * Normalises a raw invoice description into the item name the user reviews:
 * drops catalogue codes, supplier markers, classification suffixes and the
 * vendor tail, while keeping the dosage ("10MG/ML 20ML") intact.
 */
export function cleanItemName(description: string): string {
  const withoutNoise = description
    .replace(LEADING_CODES, '')
    .replace(VET_PREFIX, '')
    .replace(CLASSIFICATION, ' ')
    .replace(VENDOR_TAIL, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If stripping the vendor tail ate the whole description, keep the original.
  return withoutNoise.length > 0 ? withoutNoise : description.trim();
}

/** Dosage found in the name, e.g. "10MG/ML", "250ML", "0,25%". */
export function extractDosage(name: string): string | null {
  // A trailing \b would fail on "10%" (both "%" and the next space are
  // non-word chars), so guard with a negative lookahead instead.
  const match = name.match(
    /\b\d+(?:[.,]\d+)?\s*(?:MG\/ML|MCG|MG|ML|G|%)(?![A-Za-z])/i,
  );
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
}

function toItem(
  description: string,
  unit: string,
  quantity: number,
  rawLine: string,
  index: number,
): ScannedItem | null {
  const name = cleanItemName(description);
  if (name.length === 0 || !Number.isFinite(quantity)) {
    return null;
  }

  return {
    id: `item-${index}`,
    name,
    quantity,
    unit,
    dosage: extractDosage(name),
    rawLine,
  };
}

/**
 * Parses one row of already-split columns (the PDF path). The unit cell is
 * located first; the cell before it is the description and the cell after it is
 * the quantity.
 */
function parseRow(cells: string[], index: number): ScannedItem | null {
  const unitIndex = cells.findIndex(cell => UNIT_CODES.has(cell.trim()));
  if (unitIndex <= 0 || unitIndex >= cells.length - 1) {
    return null;
  }

  const quantityCell = cells[unitIndex + 1].trim();
  if (!INTEGER.test(quantityCell)) {
    return null;
  }

  // Guard against header rows: a real item row has money after the quantity.
  const hasMoney = cells
    .slice(unitIndex + 2)
    .some(cell => MONEY.test(cell.trim()));
  if (!hasMoney) {
    return null;
  }

  return toItem(
    cells[unitIndex - 1],
    cells[unitIndex].trim(),
    Number(quantityCell),
    cells.join(' '),
    index,
  );
}

/**
 * Parses one flat line of text (the OCR path), where the columns arrive glued
 * together. Anchors on the last "<UNIT> <QTY> <money>" occurrence so that a
 * description containing a unit-like token ("… 10 FA EST. CRISTALIA …") does
 * not throw the parser off.
 */
function parseLine(line: string, index: number): ScannedItem | null {
  TAIL.lastIndex = 0;

  let anchor: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = TAIL.exec(line)) !== null) {
    if (UNIT_CODES.has(match[1])) {
      anchor = match;
    }
  }

  if (!anchor) {
    return null;
  }

  return toItem(
    line.slice(0, anchor.index),
    anchor[1],
    Number(anchor[2]),
    line,
    index,
  );
}

/** Extracts the items from a PDF text layer already split into columns. */
export function parseInvoiceRows(rows: string[][]): ScannedItem[] {
  return rows
    .map((cells, index) => parseRow(cells, index))
    .filter((item): item is ScannedItem => item !== null);
}

/** Extracts the items from flat recognised text (one invoice line per line). */
export function parseInvoiceText(text: string): ScannedItem[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => parseLine(line, index))
    .filter((item): item is ScannedItem => item !== null);
}

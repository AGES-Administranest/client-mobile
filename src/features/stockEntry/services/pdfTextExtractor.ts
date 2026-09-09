import { inflate } from 'pako';

import { groupIntoRows, PositionedText } from './textLayout';

/**
 * One visual line of the PDF, split into the cells that make up its columns
 * (left to right). Keeping the columns separate — instead of flattening the
 * line into a string — is what makes parsing reliable: a description such as
 * "BUPIVACAINA 0,25% C/VASO 20ML 10 FA EST. CRISTALIA" contains the token "FA",
 * which would otherwise be mistaken for the unit column.
 */
export type PdfRow = string[];

// PDF text-showing operators we care about: `Tj` (show) and `'` (next line and
// show). Both are preceded by an absolute `x y Td` positioning operator.
const POSITIONED_STRING =
  /(-?[\d.]+)\s+(-?[\d.]+)\s+Td\s*\(((?:\\.|[^\\()])*)\)\s*(?:Tj|')/g;

// Rows are grouped by their Y coordinate; PDF writers emit tiny sub-point
// differences for the same visual line, so compare with a small tolerance.
const ROW_TOLERANCE = 1.5;

function bytesToLatin1(bytes: Uint8Array): string {
  // Chunked to avoid blowing the argument limit on large files.
  const CHUNK = 0x8000;
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return result;
}

// Decodes a PDF literal string: octal escapes (`\347` → "ç" in WinAnsi/latin-1),
// escaped delimiters and the usual C-style control escapes.
function decodePdfString(raw: string): string {
  return raw.replace(/\\(\d{1,3}|.)/g, (_, escape: string) => {
    if (/^\d+$/.test(escape)) {
      return String.fromCharCode(parseInt(escape, 8));
    }
    switch (escape) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      default:
        // \( \) \\ and any other escaped char stand for the char itself.
        return escape;
    }
  });
}

// Inflates every FlateDecode stream and keeps the ones that carry text.
function contentStreams(bytes: Uint8Array): string[] {
  const raw = bytesToLatin1(bytes);
  const streams: string[] = [];

  const marker = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end === -1) {
      continue;
    }

    try {
      const decoded = bytesToLatin1(inflate(bytes.subarray(start, end)));
      // Only content streams contain text operators; skip images and fonts.
      if (decoded.includes('Tj') || decoded.includes("'")) {
        streams.push(decoded);
      }
    } catch {
      // Not a Flate stream (image data, already-decoded content, …) — skip it.
    }
  }

  return streams;
}

function collectRuns(content: string): PositionedText[] {
  const runs: PositionedText[] = [];
  POSITIONED_STRING.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = POSITIONED_STRING.exec(content)) !== null) {
    const text = decodePdfString(match[3]).trim();
    if (text.length > 0) {
      runs.push({ x: Number(match[1]), y: Number(match[2]), text });
    }
  }

  return runs;
}

/**
 * Extracts the text layer of a (digitally generated) PDF as rows of columns.
 *
 * Returns an empty array for scanned/image-only PDFs, which carry no text layer
 * — those need real OCR instead.
 */
export function extractPdfRows(bytes: Uint8Array): PdfRow[] {
  return contentStreams(bytes).flatMap(content =>
    // PDF Y grows upwards; negate it so "larger Y" means "further down".
    groupIntoRows(
      collectRuns(content).map(run => ({ ...run, y: -run.y })),
      ROW_TOLERANCE,
    ),
  );
}

import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

import { ScanError } from './invoiceScanService';
import { groupIntoRows, toleranceFromHeights } from './textLayout';

/**
 * Recognises the text of a photographed invoice and returns it as visual rows
 * of columns — the same shape the PDF extractor produces, so both sources feed
 * the exact same parser.
 */
export type OcrProvider = {
  recognizeRows(imageUri: string): Promise<string[][]>;
};

/**
 * Turns an ML Kit result into rows.
 *
 * `result.text` is deliberately ignored: ML Kit concatenates block by block, so
 * on a table it emits a whole column before moving to the next one, gluing
 * unrelated values together. Rebuilding rows from each line's bounding box is
 * what keeps "description | unit | quantity | price" side by side.
 */
export function rowsFromRecognition(result: TextRecognitionResult): string[][] {
  const lines = result.blocks
    .flatMap(block => block.lines)
    .filter(line => line.frame !== undefined && line.text.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const tolerance = toleranceFromHeights(
    lines.map(line => line.frame?.height ?? 0),
  );

  return groupIntoRows(
    lines.map(line => ({
      x: line.frame?.left ?? 0,
      y: line.frame?.top ?? 0,
      text: line.text.trim(),
    })),
    tolerance,
  );
}

// Required lazily: the native module only exists in a development/production
// build. Importing it eagerly would crash Expo Go and the web bundle, where the
// rest of the app (including the PDF path) still works fine.
function loadTextRecognition() {
  try {
    return require('@react-native-ml-kit/text-recognition').default;
  } catch {
    throw new ScanError('ocrUnavailable');
  }
}

/** On-device OCR. No network, no API key — the image never leaves the phone. */
export const mlKitOcrProvider: OcrProvider = {
  async recognizeRows(imageUri: string) {
    const textRecognition = loadTextRecognition();

    let result: TextRecognitionResult;
    try {
      result = await textRecognition.recognize(imageUri);
    } catch {
      // Thrown when the native module isn't linked (Expo Go, web, missing
      // rebuild after install).
      throw new ScanError('ocrUnavailable');
    }

    return rowsFromRecognition(result);
  },
};

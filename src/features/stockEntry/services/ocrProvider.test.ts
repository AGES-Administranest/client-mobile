import type {
  TextBlock,
  TextRecognitionResult,
} from '@react-native-ml-kit/text-recognition';

import { extractItemsFromRows } from './invoiceScanService';
import { rowsFromRecognition } from './ocrProvider';

const LINE_HEIGHT = 30;

function line(text: string, left: number, top: number) {
  return {
    text,
    frame: { left, top, width: text.length * 10, height: LINE_HEIGHT },
    elements: [],
    recognizedLanguages: [],
  };
}

/** One block per column — how ML Kit commonly segments a table. */
function column(texts: string[], left: number, tops: number[]): TextBlock {
  return {
    text: texts.join('\n'),
    lines: texts.map((text, index) => line(text, left, tops[index])),
    recognizedLanguages: [],
  };
}

const ROW_TOPS = [100, 140, 180];

// A photo of the printed "Pedido" invoice, recognised column by column.
const RECOGNITION: TextRecognitionResult = {
  text: 'ignored on purpose',
  blocks: [
    column(['203950', '213494', '179088'], 20, ROW_TOPS),
    column(
      [
        '**VET CETAMINA 10% 50ML - AGENER (C1)',
        'PROPOFOL 10MG/ML F/A 20ML - TEUTO(C1)',
        'SERINGA DESC S/AG 01ML BICO LISO (INS. RES. ZERO) - SR',
      ],
      120,
      ROW_TOPS,
    ),
    column(['FA', 'FA', 'UN'], 600, ROW_TOPS),
    column(['1', '5', '100'], 660, ROW_TOPS),
    column(['193,140000', '7,300000', '0,276000'], 720, ROW_TOPS),
    column(['193,14', '36,50', '27,60'], 850, ROW_TOPS),
  ],
};

describe('rowsFromRecognition', () => {
  const rows = rowsFromRecognition(RECOGNITION);

  it('rebuilds one row per invoice line', () => {
    expect(rows).toHaveLength(3);
  });

  it('puts the columns of a row back in reading order', () => {
    expect(rows[0]).toEqual([
      '203950',
      '**VET CETAMINA 10% 50ML - AGENER (C1)',
      'FA',
      '1',
      '193,140000',
      '193,14',
    ]);
  });

  it('ignores lines without a bounding box', () => {
    const withoutFrame: TextRecognitionResult = {
      text: '',
      blocks: [
        {
          text: 'x',
          lines: [{ text: 'x', elements: [], recognizedLanguages: [] }],
          recognizedLanguages: [],
        },
      ],
    };
    expect(rowsFromRecognition(withoutFrame)).toEqual([]);
  });

  it('still groups a row when a hand-held photo is slightly skewed', () => {
    const skewed: TextRecognitionResult = {
      text: '',
      blocks: [
        column(['203950'], 20, [100]),
        // Same visual row, but drifting down across the page.
        column(['CETAMINA 10% 50ML'], 120, [108]),
        column(['FA'], 600, [113]),
      ],
    };
    expect(rowsFromRecognition(skewed)).toEqual([
      ['203950', 'CETAMINA 10% 50ML', 'FA'],
    ]);
  });
});

describe('end-to-end: recognised photo to items', () => {
  const items = extractItemsFromRows(rowsFromRecognition(RECOGNITION));

  it('extracts the name and quantity of each item', () => {
    expect(items.map(item => [item.name, item.quantity])).toEqual([
      ['CETAMINA 10% 50ML', 1],
      ['PROPOFOL 10MG/ML F/A 20ML', 5],
      ['SERINGA DESC S/AG 01ML BICO LISO (INS. RES. ZERO)', 100],
    ]);
  });

  it('reads the quantity, never the unit price', () => {
    // "UN 100 0,276000 27,60" — 100 is the quantity.
    expect(items[2].quantity).toBe(100);
  });

  it('keeps the unit code', () => {
    expect(items.map(item => item.unit)).toEqual(['FA', 'FA', 'UN']);
  });
});

describe('fallback when OCR glues a whole row into one line', () => {
  it('parses rows that arrive as a single string', () => {
    const glued = [
      ['213494 PROPOFOL 10MG/ML F/A 20ML - TEUTO(C1) FA 5 7,300000 36,50'],
    ];
    expect(extractItemsFromRows(glued).map(i => [i.name, i.quantity])).toEqual([
      ['PROPOFOL 10MG/ML F/A 20ML', 5],
    ]);
  });
});

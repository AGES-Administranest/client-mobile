import type {
  DraftDetail,
  HeaderInput,
} from 'features/stockEntry/domain/draft';
import type {
  Extraction,
  ExtractedLine,
} from 'features/stockEntry/domain/extraction';
import {
  BLOCKING_ISSUES,
  acceptComputedTotal,
  addLine,
  fromExtraction,
  lineIssue,
  linesNeedingAttention,
  linesSum,
  linkLine,
  parseDecimal,
  removeLine,
  reviewFromDetail,
  splitLine,
  splitPosition,
  toHeaderInput,
  toLinesInput,
  totalDifference,
  type ReviewLine,
} from 'features/stockEntry/domain/review';

const unitLabel = (unit: string) => unit.toLowerCase();

const PROPOFOL: ExtractedLine = {
  extractedDescription: 'PROPOFOL 1% 20ML FR',
  quantity: 20,
  unitValue: 22.5,
  totalValue: 450,
  arithmeticCheck: true,
  match: {
    decision: 'preselected',
    itemId: 'propofol',
    reason: 'FUZZY',
    confidence: 0.91,
    candidates: [
      {
        itemId: 'propofol',
        name: 'Propofol 1% 20 mL',
        unit: 'VIAL',
        score: 0.91,
      },
    ],
  },
};

const LINE: ReviewLine = {
  id: 'line-0',
  sourceIndex: 0,
  description: 'PROPOFOL 1% 20ML FR',
  quantity: 20,
  unitValue: 22.5,
  printedTotal: null,
  link: { itemId: 'propofol', name: 'Propofol 1% 20 mL', unit: 'frasco' },
  candidates: [],
  lot: '',
  expiry: '',
};

function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return { status: 'SUCCESS', items: [PROPOFOL], ...overrides };
}

describe('fromExtraction', () => {
  it('fills the header with what was read', () => {
    const { header } = fromExtraction(
      extraction({
        supplierId: 'supplier-1',
        supplier: { cnpj: '11222333000181', name: 'Vet Distribuidora' },
        invoiceNumber: '8842',
        orderDate: '2026-08-18',
        totalAmount: 2418.9,
      }),
      unitLabel,
    );

    expect(header).toEqual({
      supplierId: 'supplier-1',
      supplierName: 'Vet Distribuidora',
      invoiceNumber: '8842',
      orderDate: '18/08/2026',
      totalAmount: 2418.9,
    });
  });

  it('links a preselected line to its candidate, unit included', () => {
    const [line] = fromExtraction(extraction(), unitLabel).lines;

    expect(line).toMatchObject({
      id: 'line-0',
      description: 'PROPOFOL 1% 20ML FR',
      link: { itemId: 'propofol', name: 'Propofol 1% 20 mL', unit: 'vial' },
    });
  });

  it('leaves a suggested line unlinked, with its candidates', () => {
    const [line] = fromExtraction(
      extraction({
        items: [
          {
            ...PROPOFOL,
            match: {
              ...PROPOFOL.match,
              decision: 'suggested',
              itemId: undefined,
            },
          },
        ],
      }),
      unitLabel,
    ).lines;

    expect(line.link).toBeNull();
    expect(line.candidates).toHaveLength(1);
  });

  it('keeps the printed total only when it disagrees', () => {
    const [agrees, disagrees] = fromExtraction(
      extraction({
        items: [
          PROPOFOL,
          { ...PROPOFOL, totalValue: 500, arithmeticCheck: false },
        ],
      }),
      unitLabel,
    ).lines;

    expect(agrees.printedTotal).toBeNull();
    expect(disagrees.printedTotal).toBe(500);
  });

  it('carries the partial reading', () => {
    const partial = { pagesRead: 50, totalPages: 62 };

    expect(fromExtraction(extraction({ partial }), unitLabel).partial).toEqual(
      partial,
    );
  });
});

describe('lineIssue', () => {
  it.each<[string, Partial<ReviewLine>, ReturnType<typeof lineIssue>]>([
    ['a complete, linked line', {}, null],
    [
      'a printed total off by more than a cent',
      { printedTotal: 460 },
      'mismatch',
    ],
    ['a printed total within the rounding', { printedTotal: 450.05 }, null],
    ['no linked item', { link: null }, 'unlinked'],
    [
      'a description too short to identify',
      { link: null, description: 'SER' },
      'shortName',
    ],
    ['a short description already linked', { description: 'SER' }, null],
    ['a line added by hand', { link: null, description: '' }, 'unlinked'],
    ['no quantity', { quantity: null }, 'noQuantity'],
    ['a zero quantity', { quantity: 0 }, 'noQuantity'],
    ['no unit value', { unitValue: null }, 'noUnitValue'],
    [
      'a mismatch on an unlinked line',
      { link: null, printedTotal: 460 },
      'mismatch',
    ],
  ])('%s', (_, changes, expected) => {
    expect(lineIssue({ ...LINE, ...changes })).toBe(expected);
  });

  it.each(['', 'SER', 'SERINGA 5ML'])(
    'blocks an unlinked line described as %p',
    description => {
      const issue = lineIssue({ ...LINE, link: null, description });

      expect(issue && BLOCKING_ISSUES.includes(issue)).toBe(true);
    },
  );
});

describe('totals', () => {
  const lines = [LINE, { ...LINE, id: 'line-1', quantity: 2, unitValue: 8.4 }];

  it('adds quantity × unit value of each line', () => {
    expect(linesSum(lines)).toBe(466.8);
  });

  it('skips a line without both values', () => {
    expect(linesSum([...lines, { ...LINE, id: 'x', unitValue: null }])).toBe(
      466.8,
    );
  });

  it('tells the difference to the document total', () => {
    const header = {
      supplierId: null,
      supplierName: null,
      invoiceNumber: '',
      orderDate: '',
      totalAmount: 500,
    };

    expect(totalDifference({ header, lines, partial: null })).toBe(33.2);
    expect(
      totalDifference({
        header: { ...header, totalAmount: null },
        lines,
        partial: null,
      }),
    ).toBeNull();
  });
});

describe('editing lines', () => {
  it('drops the printed total when the user takes the computed one', () => {
    const [line] = acceptComputedTotal(
      [{ ...LINE, printedTotal: 460 }],
      LINE.id,
    );

    expect(lineIssue(line)).toBeNull();
  });

  it('links a line to the chosen item', () => {
    const item = { itemId: 'cetamina', name: 'Cetamina 10 mL', unit: 'frasco' };

    expect(linkLine([{ ...LINE, link: null }], LINE.id, item)[0].link).toEqual(
      item,
    );
  });

  it('adds an empty line that still needs an item', () => {
    const lines = addLine([LINE], 'added-1');

    expect(lines).toHaveLength(2);
    expect(lineIssue(lines[1])).toBe('unlinked');
  });

  it('counts the lines needing attention', () => {
    expect(
      linesNeedingAttention([LINE, { ...LINE, id: 'x', quantity: null }]),
    ).toHaveLength(1);
  });
});

describe('splitting a line', () => {
  it('opens an empty second lot right after the line', () => {
    const lines = splitLine(
      [
        { ...LINE, printedTotal: 460 },
        { ...LINE, id: 'other', sourceIndex: 1 },
      ],
      LINE.id,
      'split-1',
    );

    expect(lines.map(line => line.id)).toEqual(['line-0', 'split-1', 'other']);
    expect(lines[0]).toMatchObject({ quantity: 20, printedTotal: null });
    expect(lines[1]).toMatchObject({ quantity: null, lot: '', sourceIndex: 0 });
  });

  it('numbers the lots of the same document line', () => {
    const lines = splitLine(
      splitLine([LINE], LINE.id, 'split-1'),
      'split-1',
      'split-2',
    );

    expect(lines.map(line => splitPosition(lines, line))).toEqual([
      { part: 1, of: 3 },
      { part: 2, of: 3 },
      { part: 3, of: 3 },
    ]);
  });

  it('is whole again when only one lot is left', () => {
    const lines = removeLine(splitLine([LINE], LINE.id, 'split-1'), 'split-1');

    expect(splitPosition(lines, lines[0])).toBeNull();
  });

  it('never groups lines added by hand', () => {
    const lines = addLine(addLine([], 'added-1'), 'added-2');

    expect(splitPosition(lines, lines[0])).toBeNull();
  });
});

describe('reopening a saved draft', () => {
  const detail = (lines: DraftDetail['lines']): DraftDetail => ({
    id: 'invoice-1',
    extraction: extraction({ invoiceNumber: '8842' }),
    lines,
  });

  it('starts from the reading while nothing was saved', () => {
    const review = reviewFromDetail(detail([]), unitLabel);

    expect(review.lines[0].description).toBe('PROPOFOL 1% 20ML FR');
    expect(review.header.invoiceNumber).toBe('8842');
  });

  it('brings back what was saved, over the reading', () => {
    const [line] = reviewFromDetail(
      detail([
        {
          sourceIndex: 0,
          description: 'PROPOFOL 1% 20ML FR',
          item: { id: 'propofol', name: 'Propofol 1% 20 mL', unit: 'VIAL' },
          quantity: 18,
          unitCost: 22.5,
          lotNumber: 'PF8821',
          expirationDate: '2027-05-31',
          candidates: [],
        },
      ]),
      unitLabel,
    ).lines;

    expect(line).toMatchObject({
      sourceIndex: 0,
      quantity: 18,
      link: { itemId: 'propofol', name: 'Propofol 1% 20 mL', unit: 'vial' },
      lot: 'PF8821',
      expiry: '31/05/2027',
    });
  });
});

describe('saving', () => {
  it('sends each line with what was filled in', () => {
    expect(
      toLinesInput([
        { ...LINE, printedTotal: 460, lot: ' PF8821 ', expiry: '31/05/2027' },
        {
          ...LINE,
          id: 'added-1',
          sourceIndex: null,
          description: '',
          link: null,
          quantity: null,
          unitValue: null,
        },
      ]),
    ).toEqual([
      {
        sourceIndex: 0,
        description: 'PROPOFOL 1% 20ML FR',
        itemId: 'propofol',
        quantity: 20,
        unitCost: 22.5,
        totalValue: 460,
        lotNumber: 'PF8821',
        expirationDate: '2027-05-31',
      },
      { description: '' },
    ]);
  });

  it.each([
    ['31/05/2027', '2027-05-31'],
    ['31/02/2027', undefined],
    ['31/05', undefined],
  ])('sends the expiry %p as %p', (expiry, expected) => {
    const [input] = toLinesInput([{ ...LINE, expiry }]);

    expect(input.expirationDate).toBe(expected);
  });

  it.each<[string, HeaderInput['orderDate']]>([
    ['18/08/2026', '2026-08-18'],
    ['', null],
    ['18/08', undefined],
  ])('sends the header date %p as %p', (orderDate, expected) => {
    const input = toHeaderInput({
      supplierId: null,
      supplierName: null,
      invoiceNumber: ' 8842 ',
      orderDate,
      totalAmount: 490,
    });

    expect(input).toMatchObject({ invoiceNumber: '8842', totalAmount: 490 });
    expect(input.orderDate).toBe(expected);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['12', 12],
    ['1,5', 1.5],
    ['1.234,56', 1234.56],
    ['', null],
    ['abc', null],
  ])('%p → %p', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });
});

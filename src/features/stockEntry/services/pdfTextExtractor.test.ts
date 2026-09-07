import { readFileSync } from 'fs';
import { join } from 'path';

import { extractPdfRows } from './pdfTextExtractor';
import { parseInvoiceRows } from '../domain/parseInvoice';

// The real supplier quote, kept as a fixture so parsing regressions show up.
const pdfBytes = new Uint8Array(
  readFileSync(join(__dirname, '__fixtures__/cotacao-abhxsu.pdf')),
);

describe('extractPdfRows', () => {
  const rows = extractPdfRows(pdfBytes);

  it('reads the text layer', () => {
    expect(rows.length).toBeGreaterThan(10);
  });

  it('keeps each visual line as its own row of columns', () => {
    const header = rows.find(row => row.includes('Quantidade'));
    expect(header).toEqual([
      'Seq.Cli.',
      'Item',
      'Código',
      'Descrição',
      'UN.',
      'Quantidade',
      'Preço Unit',
      'Total',
      'ST.',
    ]);
  });

  it('decodes latin-1 escapes into accented characters', () => {
    expect(rows.flat().join(' ')).toContain('Descrição');
  });
});

describe('end-to-end: real PDF to items', () => {
  const items = parseInvoiceRows(extractPdfRows(pdfBytes));

  it('extracts every item of the quote', () => {
    expect(items).toHaveLength(9);
  });

  it('extracts the name (with dosage) and quantity of each item', () => {
    expect(items.map(item => [item.name, item.quantity])).toEqual([
      ['REMIFENTANILA 2MG 5 F/A IV CRISTALIA REMIFAS', 5],
      ['DEXTROCETAMINA 50MG/ML 2ML 50 AMP (ESCETAMINA) GEN HIPOLABOR', 50],
      ['METADONA 10MG/ML 1ML 25 AMP CRISTALIA MYTEDOM EXCLUSIVO', 25],
      ['PROPOFOL 10MG/ML (1%) 20ML C/5 FA IV TEUTO GEN (15A30)', 5],
      [
        'BUPIVACAINA 0,25% C/VASO 20ML 10 FA EST. CRISTALIA NEOCAINA EXCLUSIVO',
        10,
      ],
      ['AMPICILINA 1G 50 F/A S/DIL IM/IV GEN TEUTO', 50],
      ['EFEDRINA 50MG/ML 1ML 50 AD/PED HIPOLABOR GEN EFEDRINA', 50],
      ['TUBO ENDOTRAQUEAL N.6,5 COM BALAO (CUFF) C/25 MEDIX', 5],
      ['AGUA PARA INJECAO 05ML C/200 ISOFARMA', 200],
    ]);
  });

  it('never mistakes a price for a quantity', () => {
    // Every quantity in this quote is a whole number well under the totals.
    expect(items.every(item => Number.isInteger(item.quantity))).toBe(true);
  });

  it('ignores the header, the notes and the totals', () => {
    expect(items.some(item => /TOTAL|Obs|Vendedor/i.test(item.name))).toBe(
      false,
    );
  });
});

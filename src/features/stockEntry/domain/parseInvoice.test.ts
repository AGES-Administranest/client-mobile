import {
  cleanItemName,
  extractDosage,
  parseInvoiceRows,
  parseInvoiceText,
} from './parseInvoice';
import { needsAttention } from './stockItem';

// Real lines from the "Pedido" invoice (the printed one), as flat text — this
// is the shape OCR over a photo produces.
const PEDIDO_TEXT = [
  '203950 **VET CETAMINA 10% 50ML - AGENER (C1)  FA  1  193,140000  193,14',
  '216185 **VET ISOFLURANO 240ML (ISOFLURANO VETERINARIO) - SYNTEC  FR  1  295,000000  295,00',
  '216106 **VET LIDOCAINA2% S/VASO ( LIDOCOL 50ML ) - JA SAUDE ANIMAL  FA  1  29,820000  29,82',
  '199490 CATETER 20G X 1-1/4 INTRAVENOSO SAFELET RADIOPACO - NIPRO  UN  50  2,816000  140,80',
  '213494 PROPOFOL 10MG/ML F/A 20ML - TEUTO(C1)  FA  5  7,300000  36,50',
  '210555 REMIFENTANILA 2MG FA (REMISTESI) - UNIAO QUIMICA (A1)  FA  5  12,226000  61,13',
  '179088 SERINGA DESC S/AG 01ML BICO LISO (INS. RES. ZERO) - SR  UN  100  0,276000  27,60',
  '203435 SONDA ENDOTRAQUEAL C/ BALAO 10,0 WELL LEAD  UN  10  5,181000  51,81',
  '203873 SONDA ENDOTRAQUEAL C/ BALAO 4,0 WELL LEAD  UN  10  5,176000  51,76',
  '210720 SORO RINGER C/LACTATO 250ML BOLSA SC C/PVC- JP  BS  35  7,276571  254,68',
].join('\n');

// Real rows from the "Cotação" PDF, as the text-layer extractor returns them.
const COTACAO_ROWS = [
  ['Seq.Cli.', 'Item', 'Código', 'Descrição', 'UN.', 'Quantidade', 'Total'],
  [
    '000001',
    '01',
    '09506',
    'REMIFENTANILA 2MG 5 F/A IV CRISTALIA REMIFAS (A1)',
    'AM',
    '5',
    '12,3200',
    '61,60',
  ],
  [
    '000002',
    '02',
    '20052',
    'DEXTROCETAMINA 50MG/ML 2ML 50 AMP (ESCETAMINA) GEN HIPOLABOR (C1)',
    'AM',
    '50',
    '7,6267',
    '381,33',
  ],
  [
    '000005',
    '04',
    '16310',
    'PROPOFOL 10MG/ML (1%) 20ML C/5 FA IV TEUTO GEN (15A30) (C1)',
    'AM',
    '5',
    '7,3135',
    '36,57',
  ],
  [
    '000006',
    '05',
    '17066',
    'BUPIVACAINA 0,25% C/VASO 20ML 10 FA EST. CRISTALIA NEOCAINA EXCLUSIVO',
    'FA',
    '10',
    '31,5897',
    '315,90',
  ],
  ['Obs:'],
  ['TOTAL FINAL DO PEDIDO: R$', '1.368,32'],
];

describe('parseInvoiceText (OCR / flat text)', () => {
  const items = parseInvoiceText(PEDIDO_TEXT);

  it('extracts every item line', () => {
    expect(items).toHaveLength(10);
  });

  it('extracts names with their dosage and the right quantities', () => {
    expect(items.map(item => [item.name, item.quantity])).toEqual([
      ['CETAMINA 10% 50ML', 1],
      ['ISOFLURANO 240ML (ISOFLURANO VETERINARIO)', 1],
      ['LIDOCAINA2% S/VASO ( LIDOCOL 50ML )', 1],
      ['CATETER 20G X 1-1/4 INTRAVENOSO SAFELET RADIOPACO', 50],
      ['PROPOFOL 10MG/ML F/A 20ML', 5],
      ['REMIFENTANILA 2MG FA (REMISTESI)', 5],
      ['SERINGA DESC S/AG 01ML BICO LISO (INS. RES. ZERO)', 100],
      ['SONDA ENDOTRAQUEAL C/ BALAO 10,0 WELL LEAD', 10],
      ['SONDA ENDOTRAQUEAL C/ BALAO 4,0 WELL LEAD', 10],
      ['SORO RINGER C/LACTATO 250ML BOLSA SC C/PVC', 35],
    ]);
  });

  it('keeps the unit code from the invoice', () => {
    expect(items.map(item => item.unit)).toEqual([
      'FA',
      'FR',
      'FA',
      'UN',
      'FA',
      'FA',
      'UN',
      'UN',
      'UN',
      'BS',
    ]);
  });

  it('does not confuse the quantity with the unit price', () => {
    // "SERINGA … UN 100 0,276000 27,60" — 100 is the quantity, not 0,276.
    const seringa = items.find(item => item.name.startsWith('SERINGA'));
    expect(seringa?.quantity).toBe(100);
  });
});

describe('parseInvoiceRows (PDF text layer)', () => {
  const items = parseInvoiceRows(COTACAO_ROWS);

  it('skips header, notes and total rows', () => {
    expect(items).toHaveLength(4);
  });

  it('extracts names and quantities', () => {
    expect(items.map(item => [item.name, item.quantity])).toEqual([
      ['REMIFENTANILA 2MG 5 F/A IV CRISTALIA REMIFAS', 5],
      ['DEXTROCETAMINA 50MG/ML 2ML 50 AMP (ESCETAMINA) GEN HIPOLABOR', 50],
      ['PROPOFOL 10MG/ML (1%) 20ML C/5 FA IV TEUTO GEN (15A30)', 5],
      [
        'BUPIVACAINA 0,25% C/VASO 20ML 10 FA EST. CRISTALIA NEOCAINA EXCLUSIVO',
        10,
      ],
    ]);
  });

  it('is not fooled by a "FA" token inside the description', () => {
    // The BUPIVACAINA row has "10 FA EST." in its description AND unit "FA".
    const bupi = items.find(item => item.name.startsWith('BUPIVACAINA'));
    expect(bupi?.unit).toBe('FA');
    expect(bupi?.quantity).toBe(10);
  });
});

describe('cleanItemName', () => {
  it('strips catalogue codes, the **VET marker and the vendor tail', () => {
    expect(cleanItemName('203950 **VET CETAMINA 10% 50ML - AGENER (C1)')).toBe(
      'CETAMINA 10% 50ML',
    );
  });

  it('removes classification suffixes anywhere in the description', () => {
    expect(
      cleanItemName(
        'METADONA 10MG/ML 1ML 25 AMP CRISTALIA MYTEDOM ( A1 ) EXCLUSIVO',
      ),
    ).toBe('METADONA 10MG/ML 1ML 25 AMP CRISTALIA MYTEDOM EXCLUSIVO');
  });

  it('does not split a measurement like 1-1/4', () => {
    expect(cleanItemName('CATETER 20G X 1-1/4 INTRAVENOSO')).toBe(
      'CATETER 20G X 1-1/4 INTRAVENOSO',
    );
  });
});

describe('extractDosage', () => {
  it.each([
    ['PROPOFOL 10MG/ML F/A 20ML', '10MG/ML'],
    ['SORO RINGER C/LACTATO 250ML BOLSA', '250ML'],
    ['CETAMINA 10% 50ML', '10%'],
    ['SONDA ENDOTRAQUEAL C/ BALAO WELL LEAD', null],
  ])('reads the dosage out of %s', (name, expected) => {
    expect(extractDosage(name)).toBe(expected);
  });
});

describe('needsAttention', () => {
  const item = {
    id: '1',
    name: 'PROPOFOL 10MG/ML',
    quantity: 5,
    unit: 'FA',
    dosage: '10MG/ML',
    rawLine: '',
  };

  it('passes a well-formed item', () => {
    expect(needsAttention(item)).toBe(false);
  });

  it('flags a non-positive quantity', () => {
    expect(needsAttention({ ...item, quantity: 0 })).toBe(true);
  });

  it('flags an empty name', () => {
    expect(needsAttention({ ...item, name: '  ' })).toBe(true);
  });
});

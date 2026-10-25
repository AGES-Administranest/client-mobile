import type {
  Invoice,
  InvoiceKind,
  InvoiceSyncStatus,
} from '../domain/invoice.types';

const TAKERS = [
  { name: 'Clínica Veterinária Boa Vida', cnpj: '12.345.678/0001-90' },
  { name: 'Pet Shop Amigo Fiel', cnpj: '23.456.789/0001-01' },
  { name: 'Clínica Vida Animal', cnpj: '34.567.890/0001-12' },
  { name: 'Hospital Veterinário São Lucas', cnpj: '45.678.901/0001-23' },
];

const ISSUERS = [
  'Vet Farma Distribuidora',
  'AgroPet Comércio',
  'Distribuidora Animais LTDA',
  'Pet Center Brasil',
];

const STATUSES: InvoiceSyncStatus[] = [
  'SYNCED',
  'NOT_SYNCED',
  'SYNCED',
  'ERROR',
];
const KINDS: InvoiceKind[] = ['PURCHASE', 'SERVICE'];

const TOTAL = 45;
const LAST_NUMBER = 458;
const LAST_ISSUED_AT = Date.UTC(2026, 7, 10, 12);
const DAY_MS = 24 * 60 * 60 * 1000;

// Stand-in until the invoices endpoint exists: the same invoices on every call.
export const STUB_INVOICES: Invoice[] = Array.from(
  { length: TOTAL },
  (_, index) => {
    const taker = TAKERS[index % TAKERS.length];

    return {
      id: `invoice-${LAST_NUMBER - index}`,
      number: String(LAST_NUMBER - index).padStart(6, '0'),
      kind: KINDS[index % KINDS.length],
      issuerName: ISSUERS[index % ISSUERS.length],
      takerName: taker.name,
      takerCnpj: taker.cnpj,
      amount: 500 + ((index * 337) % 2500),
      issuedAt: new Date(LAST_ISSUED_AT - index * 3 * DAY_MS).toISOString(),
      syncStatus: STATUSES[index % STATUSES.length],
    };
  },
);

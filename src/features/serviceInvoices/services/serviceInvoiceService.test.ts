import type { PickedPdf } from 'shared/services/pdfPicker';

import {
  confirmServiceInvoice,
  extractServiceInvoice,
  requestServiceInvoiceUpload,
  sendServiceInvoicePdf,
  syncServiceInvoices,
} from './serviceInvoiceService';
import type { ServiceInvoiceSyncItem } from '../domain/serviceInvoice.types';

const INPUT = {
  issueDate: '2026-03-15',
  amount: 1850,
  number: '2026/0042',
  clientId: 'client-1',
};

function pdf(name: string): PickedPdf {
  return {
    uri: 'file:///cache/nota.pdf',
    bytes: new Uint8Array([1]),
    name,
    mimeType: 'application/pdf',
  };
}

async function extract(name: string) {
  const reading = extractServiceInvoice('token', pdf(name));
  await jest.runAllTimersAsync();
  return reading;
}

async function confirm(amount: number, allowDuplicate?: boolean) {
  const confirmation = confirmServiceInvoice(
    'token',
    { ...INPUT, amount },
    allowDuplicate === undefined ? undefined : { allowDuplicate },
  );
  await jest.runAllTimersAsync();
  return confirmation;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('extractServiceInvoice', () => {
  it('fails the reading for "falha"', async () => {
    expect(await extract('nota-falha.pdf')).toEqual({ status: 'FAILED' });
  });

  it('returns only the date for "parcial"', async () => {
    expect(await extract('nota-parcial.pdf')).toEqual({
      status: 'PARTIAL',
      issueDate: '2026-03-15',
    });
  });

  it('reads everything, linking nobody, for any other PDF', async () => {
    const reading = await extract('nota.pdf');

    expect(reading).toMatchObject({ status: 'SUCCESS', amount: 1850 });
    expect(reading.clientMatch).toBeUndefined();
    expect(reading.clientSuggestions).toBeUndefined();
  });

  it.each(['nota-vinculado.pdf', 'nota-match.pdf'])(
    'links the taker for %s',
    async name => {
      const reading = await extract(name);

      expect(reading.clientMatch).toMatchObject({ id: 'stand-in-client-1' });
      expect(reading.taker?.taxId).toBe('12345678000195');
    },
  );

  it.each(['nota-sugestao.pdf', 'nota-suggestion.pdf'])(
    'suggests takers without linking for %s',
    async name => {
      const reading = await extract(name);

      expect(reading.clientMatch).toBeUndefined();
      expect(reading.clientSuggestions).toHaveLength(3);
    },
  );

  it.each(['nota-novo.pdf', 'nota-new.pdf'])(
    'reads a taker that is not registered for %s',
    async name => {
      const reading = await extract(name);

      expect(reading.taker).toEqual({
        name: 'Clínica Nova Exemplo',
        taxId: '45723174000110',
      });
      expect(reading.clientMatch).toBeUndefined();
      expect(reading.clientSuggestions).toBeUndefined();
    },
  );
});

describe('extractServiceInvoice, duplicate scenario', () => {
  it.each(['nota-duplicada.pdf', 'nota-duplicate.pdf'])(
    'comes with a linked taker and the sentinel amount for %s',
    async name => {
      const reading = await extract(name);

      expect(reading.amount).toBe(7777.77);
      expect(reading.clientMatch).toMatchObject({ id: 'stand-in-client-1' });
      expect(reading.clientSuggestions).toBeUndefined();
    },
  );
});

describe('confirmServiceInvoice', () => {
  it('creates the note for an ordinary reading', async () => {
    const { amount } = await extract('nota.pdf');

    expect(await confirm(amount!)).toEqual({ id: expect.any(String) });
  });

  it.each(['nota-duplicada.pdf', 'nota-duplicate.pdf'])(
    'answers with the similar note for %s',
    async name => {
      const { amount } = await extract(name);

      expect(await confirm(amount!)).toEqual({
        duplicateOf: expect.objectContaining({
          id: 'stand-in-invoice-0',
          issueDate: INPUT.issueDate,
          amount,
        }),
      });
    },
  );

  it('creates the note anyway when the duplicate is allowed', async () => {
    const { amount } = await extract('nota-duplicada.pdf');

    expect(await confirm(amount!, true)).toEqual({ id: expect.any(String) });
  });

  it('stops reporting a duplicate once the amount is corrected', async () => {
    await extract('nota-duplicada.pdf');

    expect(await confirm(1850)).toEqual({ id: expect.any(String) });
  });
});

describe('offline sync stand-ins', () => {
  const ITEM: ServiceInvoiceSyncItem = {
    id: 'app-id-1',
    issueDate: '2026-03-15',
    amount: 1850,
    number: '2026/0042',
    clientId: 'client-1',
    fileName: 'nota.pdf',
    fileHash: 'a'.repeat(64),
    fileBytesSize: 1024,
  };

  async function sync(...items: ServiceInvoiceSyncItem[]) {
    const results = syncServiceInvoices('token', items);
    await jest.runAllTimersAsync();
    return results;
  }

  it('answers an upload target for the app id, like upload-url of backend #71', async () => {
    const pending = requestServiceInvoiceUpload('token', 'app-id-1', {
      filename: 'nota.pdf',
      fileMimeType: 'application/pdf',
      fileHash: 'a'.repeat(64),
      fileBytesSize: 1024,
    });
    await jest.runAllTimersAsync();
    const target = await pending;

    expect(target.fields.key).toContain('app-id-1');
    expect(target.fields['Content-Type']).toBe('application/pdf');
    expect(target.expiresAt).toBeGreaterThan(Date.now());
  });

  it('takes the PDF without answering anything', async () => {
    const sending = sendServiceInvoicePdf(
      { url: 'u', fields: {}, expiresAt: 1 },
      new Uint8Array([1]),
    );
    await jest.runAllTimersAsync();

    await expect(sending).resolves.toBeUndefined();
  });

  it('applies a note and names the income entry it generated', async () => {
    expect(await sync(ITEM)).toEqual([
      {
        id: 'app-id-1',
        status: 'applied',
        financialEntryId: 'stand-in-entry-app-id-1',
      },
    ]);
  });

  it('refuses the note numbered "erro", and only that one', async () => {
    const results = await sync(ITEM, {
      ...ITEM,
      id: 'app-id-2',
      number: 'erro',
    });

    expect(results.map(result => result.status)).toEqual([
      'applied',
      'conflict',
    ]);
    expect(results[1].code).toBe('SERVICE_INVOICE_SYNC_REJECTED');
  });

  it('answers a different reading for the note numbered "leitura"', async () => {
    const [result] = await sync({ ...ITEM, number: 'leitura' });

    expect(result.status).toBe('applied');
    expect(result.reading).toEqual({ amount: 1950 });
  });
});

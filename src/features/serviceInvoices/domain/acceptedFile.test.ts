import {
  fileRefusalOf,
  isAcceptedServiceInvoiceFile,
  isWithinServiceInvoiceSizeLimit,
  MAX_SERVICE_INVOICE_FILE_BYTES,
} from './acceptedFile';

describe('isAcceptedServiceInvoiceFile', () => {
  it.each([
    ['nota.pdf', 'application/pdf'],
    ['NOTA.PDF', 'application/pdf'],
    ['Nota Fiscal.Pdf', 'application/pdf'],
    ['nota.pdf', 'APPLICATION/PDF'],
    ['nota.pdf', undefined],
    ['nota.pdf', null],
    ['nota.pdf', ''],
    [' nota.pdf ', 'application/pdf'],
  ])('accepts %p (%p)', (name, mimeType) => {
    expect(isAcceptedServiceInvoiceFile({ name, mimeType })).toBe(true);
  });

  it.each([
    ['foto.jpg', 'image/jpeg'],
    ['foto.jpeg', 'image/jpeg'],
    ['print.png', 'image/png'],
    ['nota', 'application/pdf'],
    ['nota', undefined],
    ['', 'application/pdf'],
    ['nota.pdf.exe', 'application/pdf'],
    ['nota.pdfx', 'application/pdf'],
    ['pdf', 'application/pdf'],
    [
      'nota.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  ])('rejects %p (%p)', (name, mimeType) => {
    expect(isAcceptedServiceInvoiceFile({ name, mimeType })).toBe(false);
  });

  it('rejects a .pdf name whose declared type disagrees', () => {
    expect(
      isAcceptedServiceInvoiceFile({ name: 'nota.pdf', mimeType: 'image/png' }),
    ).toBe(false);
  });

  it('rejects a PDF type on a file that is not named .pdf', () => {
    expect(
      isAcceptedServiceInvoiceFile({
        name: 'nota.jpg',
        mimeType: 'application/pdf',
      }),
    ).toBe(false);
  });
});

describe('isWithinServiceInvoiceSizeLimit', () => {
  const FIFTEEN_MB = 15 * 1024 * 1024;

  it('uses the 15 MB the backend accepts', () => {
    expect(MAX_SERVICE_INVOICE_FILE_BYTES).toBe(FIFTEEN_MB);
  });

  it.each([0, 1, FIFTEEN_MB - 1, FIFTEEN_MB])('accepts %p bytes', bytes => {
    expect(isWithinServiceInvoiceSizeLimit(bytes)).toBe(true);
  });

  it.each([FIFTEEN_MB + 1, FIFTEEN_MB * 2])('refuses %p bytes', bytes => {
    expect(isWithinServiceInvoiceSizeLimit(bytes)).toBe(false);
  });
});

describe('fileRefusalOf', () => {
  it.each([
    ['SERVICE_INVOICE_FILE_TOO_LARGE', 'tooLarge'],
    ['SERVICE_INVOICE_FILE_DUPLICATED', 'alreadySent'],
  ])('maps %p to %p', (code, refusal) => {
    expect(fileRefusalOf(code)).toBe(refusal);
  });

  it.each([['SERVICE_INVOICE_NOT_FOUND'], ['toString'], [''], [null]])(
    'is not about the file for %p',
    code => {
      expect(fileRefusalOf(code)).toBeNull();
    },
  );
});

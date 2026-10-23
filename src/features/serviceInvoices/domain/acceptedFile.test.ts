import { isAcceptedServiceInvoiceFile } from './acceptedFile';

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

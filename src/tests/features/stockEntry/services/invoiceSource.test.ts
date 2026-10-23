import { pickPdf } from 'features/stockEntry/services/invoiceSource';
import { pickPdf as pickSharedPdf } from 'shared/services/pdfPicker';

jest.mock('shared/services/pdfPicker', () => ({ pickPdf: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));

const shared = jest.mocked(pickSharedPdf);

describe('stock entry pickPdf', () => {
  it('keeps declaring a PDF whatever the picker reported', async () => {
    shared.mockResolvedValue({
      uri: 'file:///cache/nota.pdf',
      bytes: new Uint8Array([1]),
      name: 'nota.pdf',
      mimeType: 'application/octet-stream',
    });

    expect(await pickPdf()).toMatchObject({ mimeType: 'application/pdf' });
  });

  it('passes a cancelled pick through', async () => {
    shared.mockResolvedValue(null);

    expect(await pickPdf()).toBeNull();
  });
});

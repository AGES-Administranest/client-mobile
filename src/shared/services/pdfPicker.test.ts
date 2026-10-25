import * as DocumentPicker from 'expo-document-picker';

import { pickPdf } from './pdfPicker';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2]).buffer),
  })),
}));

const getDocument = jest.mocked(DocumentPicker.getDocumentAsync);

function pick(asset: Partial<DocumentPicker.DocumentPickerAsset>) {
  getDocument.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/a.pdf', name: 'a.pdf', ...asset }],
  } as DocumentPicker.DocumentPickerResult);
  return pickPdf();
}

describe('pickPdf', () => {
  it('returns the type the picker declared', async () => {
    expect((await pick({ mimeType: 'image/png' }))?.mimeType).toBe('image/png');
  });

  it('falls back to PDF when the picker declares nothing', async () => {
    expect((await pick({}))?.mimeType).toBe('application/pdf');
  });

  it('resolves to null when the person cancels', async () => {
    getDocument.mockResolvedValue({
      canceled: true,
      assets: null,
    } as DocumentPicker.DocumentPickerResult);

    expect(await pickPdf()).toBeNull();
  });
});

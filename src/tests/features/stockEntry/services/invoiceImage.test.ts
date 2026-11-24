import * as ImagePicker from 'expo-image-picker';

import {
  imageMimeType,
  isAllowedMimeType,
} from 'features/stockEntry/domain/invoiceDocument';
import {
  pickInvoiceImage,
  readImageFile,
} from 'features/stockEntry/services/invoiceSource';

jest.mock('shared/services/pdfPicker', () => ({ pickPdf: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: class {
    arrayBuffer = async () => new Uint8Array([1, 2]).buffer;
  },
}));

const permission = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
const library = jest.mocked(ImagePicker.launchImageLibraryAsync);

const asset = (overrides = {}) => ({
  canceled: false,
  assets: [
    {
      uri: 'file:///photos/nota.jpg',
      fileName: 'nota.jpg',
      mimeType: 'image/jpeg',
      ...overrides,
    },
  ],
});

beforeEach(() => {
  library.mockClear();
  permission.mockResolvedValue({ granted: true } as never);
  library.mockResolvedValue(asset() as never);
});

describe('imageMimeType', () => {
  it.each([
    ['nota.jpg', 'image/jpeg', 'image/jpeg'],
    ['nota.pdf', 'application/pdf', 'application/pdf'],
    ['nota.png', 'image/png', null],
    ['nota.jpg', 'image/heic', null],
    ['foto.JPEG', undefined, 'image/jpeg'],
    ['foto.jpg', null, 'image/jpeg'],
    ['foto.png', null, null],
    ['jpg', null, null],
  ])('%s declared as %s is %s', (name, declared, expected) => {
    expect(imageMimeType(name, declared)).toBe(expected);
  });

  it.each([
    ['application/pdf', true],
    ['image/jpeg', true],
    ['image/png', false],
  ])('%s is allowed: %s', (type, allowed) => {
    expect(isAllowedMimeType(type)).toBe(allowed);
  });
});

describe('pickInvoiceImage', () => {
  it('reads the photo that was picked, at full quality', async () => {
    await expect(pickInvoiceImage()).resolves.toEqual({
      uri: 'file:///photos/nota.jpg',
      bytes: new Uint8Array([1, 2]),
      name: 'nota.jpg',
      mimeType: 'image/jpeg',
    });
    expect(library).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 1 }),
    );
  });

  it('tells when the library cannot be opened', async () => {
    permission.mockResolvedValue({ granted: false } as never);

    await expect(pickInvoiceImage()).rejects.toMatchObject({
      name: 'PickError',
      reason: 'permissionDenied',
    });
    expect(library).not.toHaveBeenCalled();
  });

  it.each([
    [{ canceled: true, assets: null }],
    [{ canceled: false, assets: [] }],
  ])('is nothing when nothing was picked (%j)', async result => {
    library.mockResolvedValue(result as never);

    await expect(pickInvoiceImage()).resolves.toBeNull();
  });

  it('refuses what the server would refuse', async () => {
    library.mockResolvedValue(
      asset({ fileName: 'print.png', mimeType: 'image/png' }) as never,
    );

    await expect(pickInvoiceImage()).rejects.toMatchObject({
      reason: 'unsupportedType',
    });
  });
});

describe('readImageFile', () => {
  it('names a photo of the camera after its file', async () => {
    await expect(
      readImageFile('file:///cache/IMG_1.jpg'),
    ).resolves.toMatchObject({ name: 'IMG_1.jpg', mimeType: 'image/jpeg' });
  });
});

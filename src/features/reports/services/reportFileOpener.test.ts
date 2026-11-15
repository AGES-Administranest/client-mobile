import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { downloadInBrowser, openLocalReport } from './reportFileOpener';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

const availableMock = Sharing.isAvailableAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  availableMock.mockResolvedValue(true);
});

describe('openLocalReport', () => {
  it.each([
    ['a.pdf', { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }],
    ['notas.ZIP', { mimeType: 'application/zip', UTI: 'public.zip-archive' }],
    ['sem-extensao', undefined],
  ])('shares %s with its type', async (name, type) => {
    const uri = `file:///documents/reports/${name}`;

    await expect(openLocalReport({ uri, name })).resolves.toBe(true);

    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, type);
  });

  it('answers false where sharing is not available', async () => {
    availableMock.mockResolvedValue(false);

    await expect(
      openLocalReport({ uri: 'file:///a.pdf', name: 'a.pdf' }),
    ).resolves.toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('downloadInBrowser', () => {
  it('uses the current tab, so a slow request needs no popup', async () => {
    await downloadInBrowser('https://s3/file');

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'https://s3/file',
      { windowName: '_self' },
    );
  });
});

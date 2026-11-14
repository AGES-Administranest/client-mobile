import * as WebBrowser from 'expo-web-browser';

import {
  legalDocumentUrl,
  openLegalDocument,
  type LegalDocumentUrls,
} from './legalDocuments';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: 'cancel' },
}));

const browser = jest.mocked(WebBrowser);

const URLS: LegalDocumentUrls = {
  privacyPolicy: 'https://example.com/privacidade',
  termsOfUse: 'https://example.com/termos',
};

beforeEach(() => {
  jest.clearAllMocks();
});

it.each([
  ['privacyPolicy', 'https://example.com/privacidade'],
  ['termsOfUse', 'https://example.com/termos'],
] as const)('reads the address of %s', (document, url) => {
  expect(legalDocumentUrl(document, URLS)).toBe(url);
});

it('has no address when the variable is missing or empty', () => {
  const urls: LegalDocumentUrls = { privacyPolicy: '', termsOfUse: undefined };

  expect(legalDocumentUrl('privacyPolicy', urls)).toBeNull();
  expect(legalDocumentUrl('termsOfUse', urls)).toBeNull();
});

it('opens the document in the in-app browser', async () => {
  browser.openBrowserAsync.mockResolvedValue({
    type: WebBrowser.WebBrowserResultType.CANCEL,
  });

  await expect(openLegalDocument('termsOfUse', URLS)).resolves.toBe(true);

  expect(browser.openBrowserAsync).toHaveBeenCalledWith(
    'https://example.com/termos',
  );
});

it('reports failure without opening anything when there is no address', async () => {
  const urls: LegalDocumentUrls = { ...URLS, privacyPolicy: undefined };

  await expect(openLegalDocument('privacyPolicy', urls)).resolves.toBe(false);

  expect(browser.openBrowserAsync).not.toHaveBeenCalled();
});

it('reports failure when the browser cannot open', async () => {
  browser.openBrowserAsync.mockRejectedValue(new Error('no browser'));

  await expect(openLegalDocument('privacyPolicy', URLS)).resolves.toBe(false);
});

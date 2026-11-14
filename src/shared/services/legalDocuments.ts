import * as WebBrowser from 'expo-web-browser';

export type LegalDocument = 'privacyPolicy' | 'termsOfUse';

export type LegalDocumentUrls = Record<LegalDocument, string | undefined>;

const CONFIGURED_URLS: LegalDocumentUrls = {
  privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  termsOfUse: process.env.EXPO_PUBLIC_TERMS_OF_USE_URL,
};

export function legalDocumentUrl(
  document: LegalDocument,
  urls: LegalDocumentUrls = CONFIGURED_URLS,
): string | null {
  return urls[document] || null;
}

export async function openLegalDocument(
  document: LegalDocument,
  urls: LegalDocumentUrls = CONFIGURED_URLS,
): Promise<boolean> {
  const url = legalDocumentUrl(document, urls);
  if (!url) {
    return false;
  }

  try {
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return false;
  }
}

import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import type { LocalReportFile } from './reportFileStore';

type ShareType = { mimeType: string; UTI: string };

const SHARE_TYPES: Record<string, ShareType> = {
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
  zip: { mimeType: 'application/zip', UTI: 'public.zip-archive' },
};

function shareTypeOf(fileName: string): ShareType | undefined {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return SHARE_TYPES[extension];
}

// The system sheet is how the person opens the file in a viewer, saves it or
// sends it. Resolves false where the device has no such sheet.
export async function openLocalReport(file: LocalReportFile): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(file.uri, shareTypeOf(file.name));

  return true;
}

// The signed URL sends an attachment; using this tab avoids popup blocking
// after an await and keeps the app open.
export async function downloadInBrowser(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, { windowName: '_self' });
}

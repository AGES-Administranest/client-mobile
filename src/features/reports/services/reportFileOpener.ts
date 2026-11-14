import { Linking, Platform, Share } from 'react-native';

import type { LocalReportFile } from './reportFileStore';

// iOS shares a file url through the system sheet (open in, save to Files).
// Android's Share only carries text, so the copy is handed to the viewer by
// its content uri until expo-sharing is part of the app.
export async function openLocalReport(file: LocalReportFile): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: file.uri });
    return;
  }

  await Linking.openURL(file.contentUri);
}

// The signed url answers with Content-Disposition: attachment, so the browser
// saves the file under its name and the app page stays where it was.
// Navigating instead of opening a tab, because a tab opened after an await is
// blocked as a popup. The app's types have no DOM, hence the narrow cast.
export function downloadInBrowser(url: string): void {
  const page = globalThis as { location?: { assign: (to: string) => void } };
  page.location?.assign(url);
}

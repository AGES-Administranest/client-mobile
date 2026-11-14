import { Platform, Share } from 'react-native';

import {
  copyReportToPickedFolder,
  type LocalReportFile,
} from './reportFileStore';

// iOS shares a file url through the system sheet (open in, save to Files).
// Android's Share only carries text, and Linking.openURL hands a content uri
// to the viewer without the read grant, so there the copy is saved to a folder
// the person picks. expo-sharing would give Android the sheet too.
export async function openLocalReport(file: LocalReportFile): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: file.uri });
    return;
  }

  await copyReportToPickedFolder(file);
}

// The signed url answers with Content-Disposition: attachment, so the browser
// saves the file under its name and the app page stays where it was.
// Navigating instead of opening a tab, because a tab opened after an await is
// blocked as a popup. The app's types have no DOM, hence the narrow cast.
export function downloadInBrowser(url: string): void {
  const page = globalThis as { location?: { assign: (to: string) => void } };
  page.location?.assign(url);
}

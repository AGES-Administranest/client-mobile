import { Directory, File } from 'expo-file-system';
import { Linking, Platform } from 'react-native';

export type SaveResult = 'saved' | 'cancelled';

function uniqueFile(directory: Directory, filename: string): File {
  const target = new File(directory, filename);
  if (!target.exists) return target;
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : '';
  return new File(directory, `${stem}-${Date.now()}${extension}`);
}

function safeFilename(filename: string): string {
  const cleaned = filename.replace(/[\\/]/g, '_').replace(/^\.+/, '').trim();
  return cleaned === '' ? 'nota_fiscal.pdf' : cleaned;
}

export async function savePdfToDevice(
  url: string,
  filename: string,
): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return 'saved';
  }

  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return 'cancelled';
  }
  await File.downloadFileAsync(
    url,
    uniqueFile(directory, safeFilename(filename)),
  );
  return 'saved';
}

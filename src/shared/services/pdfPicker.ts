import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';

/** A PDF handed over by the system picker, before anyone describes it. */
export type PickedPdf = {
  /**
   * The file on disk. Native always has one and can upload straight from it. On
   * web the picker gives a File object instead and this is `null`.
   */
  uri: string | null;
  bytes: Uint8Array;
  name: string;
  mimeType: 'application/pdf';
};

// On web the picker hands back the browser File object directly; on native we
// only get a uri, which expo-file-system reads for us.
type WebFile = { arrayBuffer: () => Promise<ArrayBuffer> };

async function readBytes(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<Uint8Array> {
  const webFile = (asset as { file?: WebFile }).file;
  if (typeof webFile?.arrayBuffer === 'function') {
    return new Uint8Array(await webFile.arrayBuffer());
  }
  return new Uint8Array(await new FsFile(asset.uri).arrayBuffer());
}

/**
 * Opens the system document picker for a PDF.
 * Resolves to `null` when the user cancels.
 */
export async function pickPdf(): Promise<PickedPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const bytes = await readBytes(asset);

  return {
    // On web there is no file on disk to upload from, so the bytes go instead.
    uri: (asset as { file?: WebFile }).file ? null : asset.uri,
    bytes,
    name: asset.name,
    // The picker was opened for PDFs only; the type is not a guess.
    mimeType: 'application/pdf',
  };
}

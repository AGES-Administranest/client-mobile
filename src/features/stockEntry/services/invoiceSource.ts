import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { ScanError } from './invoiceScanService';

export type PickedDocument = {
  bytes: Uint8Array;
  name: string;
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
export async function pickPdf(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return { bytes: await readBytes(asset), name: asset.name };
}

/**
 * Opens the system photo library so the user can pick a picture of an invoice
 * taken earlier. Resolves to `null` when the user cancels.
 */
export async function pickInvoiceImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new ScanError('permissionDenied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Full quality: downscaling costs the OCR the small print on an invoice.
    quality: 1,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

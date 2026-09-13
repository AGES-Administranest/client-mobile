import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { ScanError } from './invoiceScanService';
import { imageMimeType, PickedFile } from '../domain/invoiceDocument';

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
export async function pickPdf(): Promise<PickedFile | null> {
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

/**
 * Opens the system photo library so the user can pick a picture of an invoice
 * taken earlier. Resolves to `null` when the user cancels.
 */
export async function pickInvoiceImage(): Promise<PickedFile | null> {
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

  const asset = result.assets[0];
  return readImageFile(asset.uri, asset.fileName, asset.mimeType);
}

/**
 * Reads a photo the camera just wrote, so it can be hashed and uploaded like
 * any other picked file.
 */
export async function readImageFile(
  uri: string,
  fileName?: string | null,
  declaredMimeType?: string | null,
): Promise<PickedFile> {
  const name = fileName ?? uri.split('/').pop() ?? 'invoice.jpg';
  const mimeType = imageMimeType(name, declaredMimeType);
  if (!mimeType) {
    throw new ScanError('unsupportedType');
  }

  return {
    uri,
    bytes: new Uint8Array(await new FsFile(uri).arrayBuffer()),
    name,
    mimeType,
  };
}

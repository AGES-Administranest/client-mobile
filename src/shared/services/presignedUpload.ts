/** What `POST /upload-url` returns: the S3 form, already signed. */
export type PresignedPost = {
  url: string;
  fields: Record<string, string>;
};

export type UploadableFile = {
  /**
   * The file on disk. Native always has one and uploads straight from it; on
   * web there is no file to point at and this is `null`.
   */
  uri: string | null;
  bytes: Uint8Array;
  name: string;
  mimeType: string;
};

/**
 * No token here: S3 is authorized by the signed policy, not by Cognito.
 * Resolves with S3's answer (204 when the policy is satisfied) and rejects
 * only when the request never got there.
 */
export function postToPresignedForm(
  target: PresignedPost,
  file: UploadableFile,
): Promise<Response> {
  const form = new FormData();
  // Order matters: S3 reads the policy fields as they arrive and stops at the
  // file, ignoring whatever comes after it. The file goes last.
  for (const [name, value] of Object.entries(target.fields)) {
    form.append(name, value);
  }
  form.append('file', filePart(file));

  // No Content-Type header on purpose: fetch has to write the multipart
  // boundary itself, and setting the header by hand loses it.
  return fetch(target.url, { method: 'POST', body: form });
}

/**
 * On native the part is a descriptor of the file on disk, which React Native
 * streams without ever holding it in JS memory. On web there is no file to
 * point at, so the bytes we already read go up instead.
 */
function filePart(file: UploadableFile): Blob {
  if (file.uri) {
    return {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob;
  }

  // Only reachable on web, where react-native-web passes the browser's Blob
  // through — that one takes bytes, React Native's own type does not.
  const WebBlob = Blob as unknown as new (
    parts: ArrayBufferView[],
    options?: { type: string },
  ) => Blob;

  return new WebBlob([file.bytes], { type: file.mimeType });
}

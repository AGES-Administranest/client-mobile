import {
  readPendingPdf,
  removePendingPdf,
  savePendingPdf,
} from './pendingPdfStore';

// An in-memory mockDisk standing in for expo-file-system.
const mockDisk = new Map<string, Uint8Array>();

jest.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) =>
    parts
      .map(part =>
        typeof part === 'string' ? part : (part as { uri: string }).uri,
      )
      .join('/');

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    create() {
      mockDisk.set(this.uri, new Uint8Array());
    }
    write(bytes: Uint8Array) {
      mockDisk.set(this.uri, bytes);
    }
    async bytes() {
      return mockDisk.get(this.uri)!;
    }
    delete() {
      mockDisk.delete(this.uri);
    }
  }
  return { Directory, File, Paths: { document: { uri: 'file:///documents' } } };
});

beforeEach(() => {
  mockDisk.clear();
});

describe('pendingPdfStore', () => {
  it('keeps the PDF under the user and the note, in the document directory', async () => {
    savePendingPdf('user-1', 'inv-1', new Uint8Array([1, 2, 3]));

    expect([...mockDisk.keys()]).toEqual([
      'file:///documents/service-invoices/user-1/inv-1.pdf',
    ]);
    expect(await readPendingPdf('user-1', 'inv-1')).toEqual({
      uri: 'file:///documents/service-invoices/user-1/inv-1.pdf',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  it('does not show one user the file of another', async () => {
    savePendingPdf('user-1', 'inv-1', new Uint8Array([1]));

    expect(await readPendingPdf('user-2', 'inv-1')).toBeNull();
  });

  it('overwrites the file when the same note is saved again', async () => {
    savePendingPdf('user-1', 'inv-1', new Uint8Array([1]));
    savePendingPdf('user-1', 'inv-1', new Uint8Array([9, 9]));

    expect((await readPendingPdf('user-1', 'inv-1'))?.bytes).toEqual(
      new Uint8Array([9, 9]),
    );
  });

  it('answers null when the file is gone', async () => {
    expect(await readPendingPdf('user-1', 'missing')).toBeNull();
  });

  it('removes the file, and removing a missing one is harmless', async () => {
    savePendingPdf('user-1', 'inv-1', new Uint8Array([1]));

    removePendingPdf('user-1', 'inv-1');
    removePendingPdf('user-1', 'inv-1');

    expect(mockDisk.size).toBe(0);
  });
});

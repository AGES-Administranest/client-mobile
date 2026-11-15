import { File as ExpoFile } from 'expo-file-system';

import {
  DOWNLOAD_TIMEOUT_MS,
  findLocalReport,
  removeReportFile,
  saveReportFile,
} from './reportFileStore';

jest.mock('shared/services/localData', () => ({
  registerLocalDataCleaner: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) =>
    parts
      .map(part =>
        typeof part === 'string' ? part : (part as { uri: string }).uri,
      )
      .join('/');
  const saved = new Set<string>();

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    create = jest.fn();
    get exists() {
      return [...saved].some(uri => uri.startsWith(`${this.uri}/`));
    }
    delete() {
      for (const uri of [...saved]) {
        if (uri.startsWith(`${this.uri}/`)) saved.delete(uri);
      }
    }
  }
  class File {
    static saved = saved;
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return saved.has(this.uri);
    }
    static downloadFileAsync = jest.fn(
      (_url: string, destination: { uri: string }) => {
        saved.add(destination.uri);
        return Promise.resolve(destination);
      },
    );
  }
  return { Directory, File, Paths: { document: { uri: 'file:///documents' } } };
});

const saved = (ExpoFile as unknown as { saved: Set<string> }).saved;
const download = ExpoFile.downloadFileAsync as unknown as jest.Mock;

const REPORT = { id: 'report-1', fileName: 'relatorio.pdf' };
const URI = 'file:///documents/reports/user-1/report-1/relatorio.pdf';
const LOCAL = { uri: URI, name: 'relatorio.pdf' };

beforeEach(() => {
  jest.clearAllMocks();
  saved.clear();
});

describe('saveReportFile', () => {
  it('keeps the file in a folder of its owner and of the report', async () => {
    await expect(
      saveReportFile('user-1', REPORT, 'https://s3/file'),
    ).resolves.toEqual(LOCAL);

    expect(download).toHaveBeenCalledWith(
      'https://s3/file',
      expect.objectContaining({ uri: URI }),
      expect.objectContaining({ idempotent: true }),
    );
  });

  it('keeps two reports of the same period apart', async () => {
    const first = await saveReportFile('user-1', REPORT, 'https://s3/a');
    const second = await saveReportFile(
      'user-1',
      { ...REPORT, id: 'report-2' },
      'https://s3/b',
    );

    expect(first.uri).not.toBe(second.uri);
  });

  it('gives up on a download that does not finish in time', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    download.mockImplementationOnce(
      (_url: string, _to: unknown, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal = options.signal;
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const saving = saveReportFile('user-1', REPORT, 'https://s3/file');
    jest.advanceTimersByTime(DOWNLOAD_TIMEOUT_MS);

    await expect(saving).rejects.toThrow('aborted');
    expect(signal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});

describe('findLocalReport', () => {
  it('finds the copy kept before', async () => {
    await saveReportFile('user-1', REPORT, 'https://s3/file');

    expect(findLocalReport('user-1', REPORT)).toEqual(LOCAL);
  });

  it.each([
    ['another report', 'user-1', { ...REPORT, id: 'report-2' }],
    ['another account', 'user-2', REPORT],
  ])('finds nothing for %s', async (_name, userId, report) => {
    await saveReportFile('user-1', REPORT, 'https://s3/file');

    expect(findLocalReport(userId, report)).toBeNull();
  });
});

describe('removeReportFile', () => {
  it('drops the copy of that report only', async () => {
    const other = { ...REPORT, id: 'report-2' };
    await saveReportFile('user-1', REPORT, 'https://s3/a');
    await saveReportFile('user-1', other, 'https://s3/b');

    removeReportFile('user-1', 'report-1');

    expect(findLocalReport('user-1', REPORT)).toBeNull();
    expect(findLocalReport('user-1', other)).not.toBeNull();
  });
});

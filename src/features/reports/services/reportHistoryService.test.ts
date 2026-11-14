import { File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { apiClient } from 'shared/services/apiClient';

import {
  GENERATE_TIMEOUT_MS,
  generateReport,
  shareReport,
} from './reportHistoryService';
import type { GeneratedReport } from '../domain/report.types';

jest.mock('shared/services/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

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
    create = jest.fn();
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    static downloadFileAsync = jest.fn(
      (_url: string, destination: { uri: string }) =>
        Promise.resolve(destination),
    );
  }
  return { Directory, File, Paths: { document: { uri: 'file:///documents' } } };
});

const post = apiClient.post as jest.Mock;
const download = ExpoFile.downloadFileAsync as unknown as jest.Mock;

const GENERATED: GeneratedReport = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: 'administranest_relatorio-geral_2026-10-15_2026-11-14.pdf',
  period: { from: '2026-10-15', to: '2026-11-14' },
  sections: ['FINANCIAL', 'TRIPS'],
  generatedAt: '2026-11-12T00:18:55.335Z',
  downloadUrl: 'https://bucket.example/report-1?signature=abc',
  downloadUrlExpiresAt: 1,
  professionalIdComplete: true,
};

const originalOs = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  post.mockResolvedValue(GENERATED);
  Platform.OS = 'ios';
});

afterAll(() => {
  Platform.OS = originalOs;
});

describe('generateReport', () => {
  it('asks the backend for the PDF with the sections it knows', async () => {
    await generateReport('id-token', {
      categories: ['travel', 'financial'],
      from: '2026-10-15',
      to: '2026-11-14',
    });

    expect(post).toHaveBeenCalledWith(
      '/reports',
      {
        from: '2026-10-15',
        to: '2026-11-14',
        sections: ['FINANCIAL', 'TRIPS'],
      },
      { token: 'id-token', timeoutMs: GENERATE_TIMEOUT_MS },
    );
  });

  it('saves the PDF on the device under its own name', async () => {
    const item = await generateReport('id-token', {
      categories: ['financial'],
      from: '2026-10-15',
      to: '2026-11-14',
    });

    const fileUri = `file:///documents/reports/${GENERATED.fileName}`;
    expect(download).toHaveBeenCalledWith(
      GENERATED.downloadUrl,
      expect.objectContaining({ uri: fileUri }),
      { idempotent: true },
    );
    expect(item).toEqual({
      id: 'report-1',
      fileName: GENERATED.fileName,
      generatedAt: GENERATED.generatedAt,
      fileUri,
    });
  });

  it('downloads in the current tab so a slow generation needs no popup', async () => {
    Platform.OS = 'web';

    const item = await generateReport('id-token', {
      categories: ['financial'],
      from: '2026-10-15',
      to: '2026-11-14',
    });

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      GENERATED.downloadUrl,
      { windowName: '_self' },
    );
    expect(download).not.toHaveBeenCalled();
    expect(item.fileUri).toBeUndefined();
  });

  it('saves nothing when the backend refuses', async () => {
    post.mockRejectedValue(new Error('REPORT_SECTIONS_EMPTY'));

    await expect(
      generateReport('id-token', {
        categories: [],
        from: '2026-10-15',
        to: '2026-11-14',
      }),
    ).rejects.toThrow('REPORT_SECTIONS_EMPTY');
    expect(download).not.toHaveBeenCalled();
  });
});

describe('shareReport', () => {
  it('shares the file as a PDF', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    await expect(shareReport('file:///documents/reports/a.pdf')).resolves.toBe(
      true,
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///documents/reports/a.pdf',
      { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
    );
  });

  it('answers false where sharing is not available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    await expect(shareReport('file:///a.pdf')).resolves.toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

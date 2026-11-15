import { Directory, File } from 'expo-file-system';

import { saveReportToDevice } from './reportDeviceSaver';

const mockBytes = new Uint8Array([37, 80, 68, 70]);

jest.mock('expo-file-system', () => {
  const MockFile = jest.fn().mockImplementation(() => ({
    bytesSync: () => mockBytes,
  }));
  const MockDirectory = jest.fn();
  Object.assign(MockDirectory, { pickDirectoryAsync: jest.fn() });
  return { File: MockFile, Directory: MockDirectory };
});

const pick = jest.mocked(Directory.pickDirectoryAsync);
const REPORT = {
  uri: 'file:///documents/reports/user-1/report-1/relatorio.pdf',
  name: 'administranest_relatorio-geral_2026-10-01_2026-10-31.pdf',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveReportToDevice', () => {
  it('writes the local copy into the folder the person picked, under its name', async () => {
    const write = jest.fn();
    const createFile = jest.fn(() => ({ write }));
    pick.mockResolvedValue({ createFile } as unknown as Directory);

    await expect(saveReportToDevice(REPORT)).resolves.toBe('saved');

    expect(File).toHaveBeenCalledWith(REPORT.uri);
    expect(createFile).toHaveBeenCalledWith(REPORT.name, 'application/pdf');
    expect(write).toHaveBeenCalledWith(mockBytes);
  });

  it('does nothing when the person closes the folder picker', async () => {
    pick.mockRejectedValue(new Error('cancelled'));

    await expect(saveReportToDevice(REPORT)).resolves.toBe('cancelled');
  });
});

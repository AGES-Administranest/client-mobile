import { Directory, File } from 'expo-file-system';

import { copyReportToPickedFolder } from './reportFileStore';

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: Object.assign(jest.fn(), { pickDirectoryAsync: jest.fn() }),
  File: jest.fn(),
}));

const pickMock = Directory.pickDirectoryAsync as jest.Mock;
const FileMock = File as unknown as jest.Mock;

const LOCAL = {
  uri: 'file:///documents/reports/user-1/r1/relatorio.pdf',
  contentUri: 'content://r1',
  name: 'relatorio.pdf',
  mimeType: 'application/pdf',
};

beforeEach(() => jest.resetAllMocks());

describe('copyReportToPickedFolder', () => {
  it('writes the copy, under its name and type, in the folder picked', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const write = jest.fn();
    const createFile = jest.fn().mockReturnValue({ write });
    pickMock.mockResolvedValue({ createFile });
    FileMock.mockImplementation(() => ({
      bytes: () => Promise.resolve(bytes),
    }));

    await expect(copyReportToPickedFolder(LOCAL)).resolves.toBe(true);

    expect(FileMock).toHaveBeenCalledWith(LOCAL.uri);
    expect(createFile).toHaveBeenCalledWith('relatorio.pdf', 'application/pdf');
    expect(write).toHaveBeenCalledWith(bytes);
  });

  it('does nothing when the picker is closed without a folder', async () => {
    pickMock.mockRejectedValue(
      Object.assign(new Error('cancelled'), { code: 'ERR_PICKER_CANCELLED' }),
    );

    await expect(copyReportToPickedFolder(LOCAL)).resolves.toBe(false);
    expect(FileMock).not.toHaveBeenCalled();
  });

  it('lets any other failure through', async () => {
    pickMock.mockRejectedValue(new Error('no storage'));

    await expect(copyReportToPickedFolder(LOCAL)).rejects.toThrow('no storage');
  });
});

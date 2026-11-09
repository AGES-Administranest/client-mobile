import { Directory, File } from 'expo-file-system';
import { Linking, Platform } from 'react-native';

import { savePdfToDevice } from './invoicePdfSaver';

jest.mock('expo-file-system', () => {
  const File = jest.fn().mockImplementation((directory, name) => ({
    directory,
    name,
    exists: false,
  }));
  Object.assign(File, { downloadFileAsync: jest.fn() });
  const Directory = jest.fn();
  Object.assign(Directory, { pickDirectoryAsync: jest.fn() });
  return { File, Directory };
});

const pick = jest.mocked(Directory.pickDirectoryAsync);
const download = jest.mocked(File.downloadFileAsync);
const FOLDER = { uri: 'file:///chosen' } as unknown as Directory;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('savePdfToDevice', () => {
  it('downloads into the folder the person picked, under the given name', async () => {
    pick.mockResolvedValue(FOLDER);

    await expect(savePdfToDevice('https://bucket/x', 'nota.pdf')).resolves.toBe(
      'saved',
    );

    expect(download).toHaveBeenCalledWith(
      'https://bucket/x',
      expect.objectContaining({ directory: FOLDER, name: 'nota.pdf' }),
    );
  });

  it.each([
    ['../../etc/passwd', '_.._etc_passwd'],
    ['a/b\\c.pdf', 'a_b_c.pdf'],
    ['', 'nota_fiscal.pdf'],
  ])('never lets the name %j leave the chosen folder', async (name, saved) => {
    pick.mockResolvedValue(FOLDER);

    await savePdfToDevice('https://bucket/x', name);

    expect(download).toHaveBeenCalledWith(
      'https://bucket/x',
      expect.objectContaining({ name: saved }),
    );
  });

  it('does not download when the picker is closed', async () => {
    pick.mockRejectedValue(new Error('cancelled'));

    await expect(savePdfToDevice('https://bucket/x', 'nota.pdf')).resolves.toBe(
      'cancelled',
    );

    expect(download).not.toHaveBeenCalled();
  });

  it('keeps an existing file by saving under a new name', async () => {
    pick.mockResolvedValue(FOLDER);
    jest
      .mocked(File)
      .mockImplementationOnce(
        (directory, name) =>
          ({ directory, name, exists: true } as unknown as File),
      );

    await savePdfToDevice('https://bucket/x', 'nota.pdf');

    const target = download.mock.calls[0][1] as unknown as { name: string };
    expect(target.name).toMatch(/^nota-\d+\.pdf$/);
  });

  it('lets the browser download on the web', async () => {
    Platform.OS = 'web';

    await savePdfToDevice('https://bucket/x', 'nota.pdf');

    expect(Linking.openURL).toHaveBeenCalledWith('https://bucket/x');
    expect(pick).not.toHaveBeenCalled();
  });
});

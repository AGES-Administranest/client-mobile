import ReactTestRenderer, { act } from 'react-test-renderer';

import { isOnline } from 'shared/services/network';

import { useDeleteReport } from './useDeleteReport';
import { removeReportFile } from '../services/reportFileStore';
import { deleteReport } from '../services/reportHistoryService';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'id-token' },
    account: { id: 'user-1' },
  }),
}));

jest.mock('shared/services/network', () => ({ isOnline: jest.fn() }));

jest.mock('../services/reportFileStore', () => ({
  removeReportFile: jest.fn(),
}));

jest.mock('../services/reportHistoryService', () => ({
  deleteReport: jest.fn(),
}));

const onlineMock = isOnline as jest.Mock;
const removeFileMock = removeReportFile as jest.Mock;
const deleteMock = deleteReport as jest.Mock;

function renderDeletion() {
  const result = {
    current: null as unknown as ReturnType<typeof useDeleteReport>,
  };

  function TestHarness() {
    result.current = useDeleteReport();
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

async function removeReport(
  result: { current: ReturnType<typeof useDeleteReport> },
  id: string,
) {
  let deleted = false;

  await act(async () => {
    deleted = await result.current.remove(id);
  });

  return deleted;
}

beforeEach(() => {
  jest.resetAllMocks();
  onlineMock.mockResolvedValue(true);
  deleteMock.mockResolvedValue(undefined);
});

describe('useDeleteReport', () => {
  it('deletes on the API and then the copy on the device', async () => {
    const result = renderDeletion();

    await expect(removeReport(result, 'report-1')).resolves.toBe(true);

    expect(deleteMock).toHaveBeenCalledWith('id-token', 'report-1');
    expect(removeFileMock).toHaveBeenCalledWith('user-1', 'report-1');
    expect(result.current.error).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it('does not delete anything without a connection and says so', async () => {
    onlineMock.mockResolvedValue(false);
    const result = renderDeletion();

    await expect(removeReport(result, 'report-1')).resolves.toBe(false);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(removeFileMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('offline');
  });

  it('keeps the copy on the device when the API refuses', async () => {
    deleteMock.mockRejectedValue(new Error('500'));
    const result = renderDeletion();

    await expect(removeReport(result, 'report-1')).resolves.toBe(false);

    expect(removeFileMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe('failed');
  });

  it('still counts as deleted when the copy on the device cannot be removed', async () => {
    removeFileMock.mockImplementation(() => {
      throw new Error('locked');
    });
    const result = renderDeletion();

    await expect(removeReport(result, 'report-1')).resolves.toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears the error', async () => {
    onlineMock.mockResolvedValue(false);
    const result = renderDeletion();
    await removeReport(result, 'report-1');

    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });
});

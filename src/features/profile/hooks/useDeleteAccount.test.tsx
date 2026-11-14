import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthError, useAuth } from 'features/auth';
import { isOnline } from 'shared/services/network';

import { useDeleteAccount, type DeleteAccountState } from './useDeleteAccount';

jest.mock('features/auth', () => ({
  AuthError: jest.requireActual('features/auth/domain/authErrors').AuthError,
  useAuth: jest.fn(),
}));
jest.mock('shared/services/network', () => ({ isOnline: jest.fn() }));

const deleteAccount = jest.fn();
const finishAccountDeletion = jest.fn();

function render(active = true) {
  const result = { current: undefined as DeleteAccountState | undefined };

  function Probe({ isActive }: { isActive: boolean }) {
    result.current = useDeleteAccount(isActive);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Probe isActive={active} />);
  });

  return {
    result,
    setActive: (isActive: boolean) =>
      act(() => renderer.update(<Probe isActive={isActive} />)),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({
    deleteAccount,
    finishAccountDeletion,
  } as unknown as ReturnType<typeof useAuth>);
  jest.mocked(isOnline).mockResolvedValue(true);
  deleteAccount.mockResolvedValue(undefined);
});

it('only lets the person submit once a password is typed', () => {
  const { result } = render();
  expect(result.current!.canSubmit).toBe(false);

  act(() => result.current!.setPassword('Senha@1234'));

  expect(result.current!.canSubmit).toBe(true);
});

it('ends on done after deleting with the typed password', async () => {
  const { result } = render();
  act(() => result.current!.setPassword('Senha@1234'));

  await act(async () => {
    await result.current!.submit();
  });

  expect(deleteAccount).toHaveBeenCalledWith('Senha@1234');
  expect(result.current!.phase).toBe('done');
});

it('does not send an empty password', async () => {
  const { result } = render();

  await act(async () => {
    await result.current!.submit();
  });

  expect(deleteAccount).not.toHaveBeenCalled();
  expect(result.current!.phase).toBe('idle');
});

it('asks for a connection without trying anything when the device is offline', async () => {
  jest.mocked(isOnline).mockResolvedValue(false);
  const { result } = render();
  act(() => result.current!.setPassword('Senha@1234'));

  await act(async () => {
    await result.current!.submit();
  });

  expect(result.current!.phase).toBe('offline');
  expect(deleteAccount).not.toHaveBeenCalled();
});

it.each([
  ['INVALID_CREDENTIALS', 'wrongPassword'],
  ['NETWORK_UNAVAILABLE', 'offline'],
  ['TOO_MANY_ATTEMPTS', 'failed'],
])('shows %s as %s', async (code, phase) => {
  deleteAccount.mockRejectedValue(new AuthError(code as never));
  const { result } = render();
  act(() => result.current!.setPassword('Senha@1234'));

  await act(async () => {
    await result.current!.submit();
  });

  expect(result.current!.phase).toBe(phase);
});

it('ignores a second tap while the deletion is running', async () => {
  let release!: () => void;
  deleteAccount.mockReturnValue(
    new Promise<void>(resolve => {
      release = resolve;
    }),
  );
  const { result } = render();
  act(() => result.current!.setPassword('Senha@1234'));

  await act(async () => {
    result.current!.submit();
    result.current!.submit();
  });
  expect(result.current!.phase).toBe('deleting');

  await act(async () => release());

  expect(deleteAccount).toHaveBeenCalledTimes(1);
});

it('goes back to the form on dismiss but never while deleting', async () => {
  deleteAccount.mockRejectedValue(
    new AuthError('INVALID_CREDENTIALS' as never),
  );
  const { result } = render();
  act(() => result.current!.setPassword('errada'));
  await act(async () => {
    await result.current!.submit();
  });

  act(() => result.current!.dismiss());

  expect(result.current!.phase).toBe('idle');
  expect(result.current!.password).toBe('errada');
});

it('forgets the password when the screen closes', () => {
  const { result, setActive } = render();
  act(() => result.current!.setPassword('Senha@1234'));

  setActive(false);

  expect(result.current!.password).toBe('');
  expect(result.current!.phase).toBe('idle');
});

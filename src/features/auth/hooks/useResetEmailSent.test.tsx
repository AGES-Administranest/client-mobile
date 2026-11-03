import ReactTestRenderer, { act } from 'react-test-renderer';

import { useResetEmailSent } from './useResetEmailSent';
import * as authService from '../services/authService';

jest.mock('../services/authService');

jest.mock('./useResendCountdown', () => ({
  useResendCountdown: () => ({ label: '00:00', canResend: true }),
}));

const onResent = jest.fn();

const service = jest.mocked(authService);

function mount() {
  const seen = {} as { current: ReturnType<typeof useResetEmailSent> };

  function Probe() {
    seen.current = useResetEmailSent('ana@example.com', 1_000, onResent);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Probe />);
  });
  return { seen, renderer };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useResetEmailSent', () => {
  it('reports the resend once the e-mail was sent again', async () => {
    service.forgotPassword.mockResolvedValue();
    const { seen } = mount();

    await act(async () => {
      await seen.current.resend();
    });

    expect(service.forgotPassword).toHaveBeenCalledWith('ana@example.com');
    expect(onResent).toHaveBeenCalledTimes(1);
  });

  it('does not report the resend when the screen was left during the call', async () => {
    let finish: () => void = () => {};
    service.forgotPassword.mockReturnValue(
      new Promise<void>(resolve => {
        finish = resolve;
      }),
    );
    const { seen, renderer } = mount();

    let pending!: Promise<void> | undefined;
    act(() => {
      pending = seen.current.resend();
    });
    act(() => renderer.unmount());
    await act(async () => {
      finish();
      await pending;
    });

    expect(onResent).not.toHaveBeenCalled();
  });
});

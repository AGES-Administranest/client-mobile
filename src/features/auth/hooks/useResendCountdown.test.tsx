import ReactTestRenderer, { act } from 'react-test-renderer';

import { useResendCountdown } from './useResendCountdown';

type Countdown = ReturnType<typeof useResendCountdown>;

function mount(sentAt: number) {
  const seen = { current: null as unknown as Countdown, renders: 0 };

  function Probe({ at }: { at: number }) {
    seen.current = useResendCountdown(at);
    seen.renders += 1;
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Probe at={sentAt} />);
  });
  const resendAt = (at: number) =>
    act(() => renderer.update(<Probe at={at} />));
  return { seen, renderer, resendAt };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useResendCountdown', () => {
  it('starts at the full cooldown and counts down every second', () => {
    const { seen } = mount(Date.now());

    expect(seen.current.label).toBe('00:45');
    expect(seen.current.canResend).toBe(false);

    act(() => jest.advanceTimersByTime(1000));

    expect(seen.current.label).toBe('00:44');
  });

  it('counts from the moment the e-mail was sent, not from the mount', () => {
    const { seen } = mount(Date.now() - 10_000);

    expect(seen.current.label).toBe('00:35');
  });

  it('is already released, with no interval, when the cooldown ended before the mount', () => {
    const { seen } = mount(Date.now() - 60_000);

    expect(seen.current.canResend).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops its interval at zero, so nothing re-renders afterwards', () => {
    const { seen } = mount(Date.now());

    act(() => jest.advanceTimersByTime(45_000));
    expect(seen.current.canResend).toBe(true);
    expect(jest.getTimerCount()).toBe(0);

    const rendersAtZero = seen.renders;
    act(() => jest.advanceTimersByTime(10_000));

    expect(seen.renders).toBe(rendersAtZero);
  });

  it('counts again from the full cooldown when the e-mail is sent again', () => {
    const { seen, resendAt } = mount(Date.now());
    act(() => jest.advanceTimersByTime(45_000));

    resendAt(Date.now());

    expect(seen.current.label).toBe('00:45');
    expect(seen.current.canResend).toBe(false);
    expect(jest.getTimerCount()).toBe(1);

    act(() => jest.advanceTimersByTime(1000));
    expect(seen.current.label).toBe('00:44');
  });

  it('clears the interval on unmount', () => {
    const { renderer } = mount(Date.now());
    expect(jest.getTimerCount()).toBe(1);

    act(() => renderer.unmount());

    expect(jest.getTimerCount()).toBe(0);
  });
});

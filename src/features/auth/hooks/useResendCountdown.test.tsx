import ReactTestRenderer, { act } from 'react-test-renderer';

import { useResendCountdown } from './useResendCountdown';

type Countdown = ReturnType<typeof useResendCountdown>;

function mount() {
  const seen = { current: null as unknown as Countdown, renders: 0 };

  function Probe() {
    seen.current = useResendCountdown();
    seen.renders += 1;
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Probe />);
  });
  return { seen, renderer };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useResendCountdown', () => {
  it('starts at the full cooldown and counts down every second', () => {
    const { seen } = mount();

    expect(seen.current.label).toBe('00:45');
    expect(seen.current.canResend).toBe(false);

    act(() => jest.advanceTimersByTime(1000));

    expect(seen.current.label).toBe('00:44');
  });

  it('stops its interval at zero, so nothing re-renders afterwards', () => {
    const { seen } = mount();

    act(() => jest.advanceTimersByTime(45_000));
    expect(seen.current.canResend).toBe(true);
    expect(jest.getTimerCount()).toBe(0);

    const rendersAtZero = seen.renders;
    act(() => jest.advanceTimersByTime(10_000));

    expect(seen.renders).toBe(rendersAtZero);
  });

  it('counts again from the full cooldown after a restart', () => {
    const { seen } = mount();
    act(() => jest.advanceTimersByTime(45_000));

    act(() => seen.current.restart());

    expect(seen.current.label).toBe('00:45');
    expect(seen.current.canResend).toBe(false);
    expect(jest.getTimerCount()).toBe(1);

    act(() => jest.advanceTimersByTime(1000));
    expect(seen.current.label).toBe('00:44');
  });

  it('clears the interval on unmount', () => {
    const { renderer } = mount();
    expect(jest.getTimerCount()).toBe(1);

    act(() => renderer.unmount());

    expect(jest.getTimerCount()).toBe(0);
  });
});

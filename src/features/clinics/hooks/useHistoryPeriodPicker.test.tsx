import ReactTestRenderer, { act } from 'react-test-renderer';

import { useHistoryPeriodPicker } from './useHistoryPeriodPicker';
import type { HistoryPeriod } from '../domain/clientHistory';

const AUGUST = { from: '2026-08-01', to: '2026-08-31' };

function renderPicker(period: HistoryPeriod = AUGUST) {
  const onApply = jest.fn();
  const result = {
    current: null as unknown as ReturnType<typeof useHistoryPeriodPicker>,
  };

  function TestHarness() {
    result.current = useHistoryPeriodPicker(period, onApply);
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return { result, onApply };
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 3, 10) });
});

afterEach(() => {
  jest.useRealTimers();
});

test('opens the calendar on the period in use', () => {
  const { result } = renderPicker();

  act(() => result.current.toggle());

  expect(result.current.isOpen).toBe(true);
  expect(result.current.draft).toEqual(AUGUST);
  expect(result.current.canApply).toBe(true);
});

test('only applies once both ends of the new period are chosen', () => {
  const { result, onApply } = renderPicker();
  act(() => result.current.toggle());

  act(() => result.current.choose({ from: '2026-08-10', to: null }));
  expect(result.current.canApply).toBe(false);
  act(() => result.current.apply());
  expect(onApply).not.toHaveBeenCalled();

  act(() => result.current.choose({ from: '2026-08-10', to: '2026-08-24' }));
  act(() => result.current.apply());

  expect(onApply).toHaveBeenCalledWith({
    from: '2026-08-10',
    to: '2026-08-24',
  });
  expect(result.current.isOpen).toBe(false);
});

test('goes back to the current month in one tap', () => {
  const { result, onApply } = renderPicker();
  act(() => result.current.toggle());

  act(() => result.current.showCurrentMonth());

  expect(onApply).toHaveBeenCalledWith({
    from: '2026-11-01',
    to: '2026-11-30',
  });
  expect(result.current.isOpen).toBe(false);
});

test('drops an unapplied choice when the calendar closes', () => {
  const { result, onApply } = renderPicker();
  act(() => result.current.toggle());
  act(() => result.current.choose({ from: '2026-08-10', to: null }));

  act(() => result.current.toggle());
  act(() => result.current.toggle());

  expect(result.current.draft).toEqual(AUGUST);
  expect(onApply).not.toHaveBeenCalled();
});

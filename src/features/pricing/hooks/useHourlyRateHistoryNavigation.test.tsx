import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  useHourlyRateHistoryNavigation,
  type HourlyRateHistoryNavigation,
} from './useHourlyRateHistoryNavigation';

const SEPTEMBER = { month: 9, year: 2026 };

let navigation: HourlyRateHistoryNavigation;
const onClose = jest.fn();

function Probe() {
  navigation = useHourlyRateHistoryNavigation(onClose);
  return null;
}

async function mount() {
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
}

// Reads the hook's latest values after each call, as a screen would.
const call = (action: () => void) => act(async () => action());

beforeEach(() => {
  onClose.mockReset();
});

test('starts on the history, at the first window, with nothing selected', async () => {
  await mount();

  expect(navigation.screen).toBe('history');
  expect(navigation.state).toEqual({
    view: 'history',
    detailMonth: null,
    windowIndex: 0,
    pickedId: null,
  });
});

test('back from the history closes it, and does not touch the state', async () => {
  await mount();

  await call(() => navigation.back());

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(navigation.screen).toBe('history');
});

test('back steps through the screens it was opened from, and closes only at the end', async () => {
  await mount();
  await call(() => navigation.openAll());
  await call(() => navigation.openMonth(SEPTEMBER));
  expect(navigation.screen).toBe('detail');

  await call(() => navigation.back());
  expect(navigation.screen).toBe('all');
  await call(() => navigation.back());
  expect(navigation.screen).toBe('history');
  expect(onClose).not.toHaveBeenCalled();

  await call(() => navigation.back());
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the window and the selected month survive a month detail', async () => {
  await mount();
  await call(() => navigation.changeWindow(2, 3));
  await call(() => navigation.pickMonth('2026-2'));

  await call(() => navigation.openMonth(SEPTEMBER));
  await call(() => navigation.back());

  expect(navigation.screen).toBe('history');
  expect(navigation.state).toMatchObject({
    windowIndex: 2,
    pickedId: '2026-2',
  });
});

test('keeps the window inside the windows there are', async () => {
  await mount();

  await call(() => navigation.changeWindow(7, 3));

  expect(navigation.state.windowIndex).toBe(2);
});

describe('scroll offsets', () => {
  it('gives back what was remembered for each screen, and nothing before that', async () => {
    await mount();
    expect(navigation.takeOffset('history')).toBeNull();

    navigation.rememberOffset('history', 350);
    navigation.rememberOffset('all', 120);

    expect(navigation.takeOffset('history')).toBe(350);
    expect(navigation.takeOffset('all')).toBe(120);
  });

  it('reads without clearing, so a later return finds it again', async () => {
    await mount();
    navigation.rememberOffset('history', 350);

    navigation.takeOffset('history');

    expect(navigation.takeOffset('history')).toBe(350);
  });

  it('the detail always opens at its top', async () => {
    await mount();
    navigation.rememberOffset('detail', 500);

    expect(navigation.takeOffset('detail')).toBeNull();
  });

  it('the latest offset wins', async () => {
    await mount();
    navigation.rememberOffset('history', 100);
    navigation.rememberOffset('history', 240);

    expect(navigation.takeOffset('history')).toBe(240);
  });
});

test('reset starts over: the history, the first window and no scroll left', async () => {
  await mount();
  await call(() => navigation.changeWindow(1, 3));
  await call(() => navigation.openAll());
  navigation.rememberOffset('all', 90);

  await call(() => navigation.reset());

  expect(navigation.screen).toBe('history');
  expect(navigation.state.windowIndex).toBe(0);
  expect(navigation.takeOffset('all')).toBeNull();
});

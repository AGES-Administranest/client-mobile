import {
  clampWindowIndex,
  currentScreen,
  historyBack,
  historyNavigationReducer,
  INITIAL_HISTORY_NAVIGATION,
  type HistoryNavigationAction,
  type HistoryNavigationState,
} from './hourlyRateHistoryNavigation';

const SEPTEMBER = { month: 9, year: 2026 };
const MAY = { month: 5, year: 2026 };

const run = (
  actions: HistoryNavigationAction[],
  from: HistoryNavigationState = INITIAL_HISTORY_NAVIGATION,
) => actions.reduce(historyNavigationReducer, from);

// The history as it is left after a look at an older window and a tap on the
// chart.
const OLDER_WINDOW = run([
  { type: 'changeWindow', index: 1, windowCount: 3 },
  { type: 'pickMonth', id: '2026-2' },
]);

describe('currentScreen', () => {
  it.each([
    [INITIAL_HISTORY_NAVIGATION, 'history'],
    [run([{ type: 'openAll' }]), 'all'],
    [run([{ type: 'openMonth', month: SEPTEMBER }]), 'detail'],
    [
      run([{ type: 'openAll' }, { type: 'openMonth', month: SEPTEMBER }]),
      'detail',
    ],
  ] as const)('%j is %s', (state, expected) => {
    expect(currentScreen(state)).toBe(expected);
  });
});

describe('opening', () => {
  it('"Todos os meses" is a view on its own', () => {
    expect(run([{ type: 'openAll' }])).toEqual({
      ...INITIAL_HISTORY_NAVIGATION,
      view: 'all',
    });
  });

  it('a month opens over the view it was tapped in and leaves the rest alone', () => {
    const opened = run([{ type: 'openMonth', month: SEPTEMBER }], OLDER_WINDOW);

    expect(opened).toEqual({ ...OLDER_WINDOW, detailMonth: SEPTEMBER });
  });

  it('opening another month replaces the one open', () => {
    expect(
      run([
        { type: 'openMonth', month: SEPTEMBER },
        { type: 'openMonth', month: MAY },
      ]).detailMonth,
    ).toEqual(MAY);
  });
});

describe('back', () => {
  it('closes from the history, and says so', () => {
    expect(historyBack(INITIAL_HISTORY_NAVIGATION)).toEqual({
      state: INITIAL_HISTORY_NAVIGATION,
      closes: true,
    });
  });

  it.each([
    [
      'history → detail → history → closes',
      [{ type: 'openMonth', month: SEPTEMBER }] as HistoryNavigationAction[],
      ['history', 'closes'],
    ],
    [
      'history → all → detail → all → history → closes',
      [
        { type: 'openAll' },
        { type: 'openMonth', month: SEPTEMBER },
      ] as HistoryNavigationAction[],
      ['all', 'history', 'closes'],
    ],
  ])('chain %s', (_name, opening, expected) => {
    let state = run(opening);
    const seen: string[] = [];

    for (
      let steps = 0;
      steps < 5 && seen[seen.length - 1] !== 'closes';
      steps += 1
    ) {
      const result = historyBack(state);
      expect(historyNavigationReducer(state, { type: 'back' })).toEqual(
        result.state,
      );
      seen.push(result.closes ? 'closes' : currentScreen(result.state));
      state = result.state;
    }

    expect(seen).toEqual(expected);
  });

  it('keeps the window and the selected month all the way back', () => {
    const state = run(
      [
        { type: 'openAll' },
        { type: 'openMonth', month: SEPTEMBER },
        { type: 'back' },
        { type: 'back' },
      ],
      OLDER_WINDOW,
    );

    expect(state).toEqual(OLDER_WINDOW);
  });
});

describe('changeWindow', () => {
  it.each([
    [0, 3, 0],
    [1, 3, 1],
    [2, 3, 2],
    // Past the last window and before the first: kept inside them.
    [3, 3, 2],
    [99, 3, 2],
    [-1, 3, 0],
    // One window, or none yet: there is nowhere else to go.
    [1, 1, 0],
    [1, 0, 0],
  ])('index %p of %p windows lands on %p', (index, windowCount, expected) => {
    const state = run([{ type: 'changeWindow', index, windowCount }]);

    expect(state.windowIndex).toBe(expected);
    expect(clampWindowIndex(index, windowCount)).toBe(expected);
  });

  it('clears the selected month, which belonged to the other window', () => {
    expect(OLDER_WINDOW.pickedId).toBe('2026-2');

    const moved = run(
      [{ type: 'changeWindow', index: 0, windowCount: 3 }],
      OLDER_WINDOW,
    );

    expect(moved).toMatchObject({ windowIndex: 0, pickedId: null });
  });
});

describe('pickMonth', () => {
  it('selects the month and keeps the window', () => {
    const picked = run(
      [{ type: 'pickMonth', id: '2026-5' }],
      run([{ type: 'changeWindow', index: 2, windowCount: 3 }]),
    );

    expect(picked).toMatchObject({ windowIndex: 2, pickedId: '2026-5' });
  });

  it('opens nothing', () => {
    expect(run([{ type: 'pickMonth', id: '2026-5' }]).detailMonth).toBeNull();
  });
});

describe('reset', () => {
  it('goes back to the history as it opens the first time', () => {
    const used = run([
      { type: 'changeWindow', index: 1, windowCount: 3 },
      { type: 'openAll' },
      { type: 'openMonth', month: SEPTEMBER },
    ]);

    expect(historyNavigationReducer(used, { type: 'reset' })).toEqual(
      INITIAL_HISTORY_NAVIGATION,
    );
  });
});

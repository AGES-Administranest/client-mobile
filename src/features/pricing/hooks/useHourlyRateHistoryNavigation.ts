import { useCallback, useReducer, useRef } from 'react';

import type { MonthPeriod } from 'shared/utils/monthPeriod';

import {
  currentScreen,
  historyBack,
  historyNavigationReducer,
  INITIAL_HISTORY_NAVIGATION,
  type HistoryNavigationState,
  type HistoryScreen,
} from '../domain/hourlyRateHistoryNavigation';

export type HourlyRateHistoryNavigation = {
  state: HistoryNavigationState;
  screen: HistoryScreen;
  openAll: () => void;
  openMonth: (month: MonthPeriod) => void;
  // Steps back one screen, or calls `onClose` from the history.
  back: () => void;
  changeWindow: (index: number, windowCount: number) => void;
  pickMonth: (id: string) => void;
  // Starts over, as when the history is opened again.
  reset: () => void;
  // Where each screen was scrolled to, so one reached by coming back can be
  // scrolled there again. Reading it does not clear it.
  rememberOffset: (screen: HistoryScreen, offset: number) => void;
  takeOffset: (screen: HistoryScreen) => number | null;
};

export function useHourlyRateHistoryNavigation(
  onClose: () => void,
): HourlyRateHistoryNavigation {
  const [state, dispatch] = useReducer(
    historyNavigationReducer,
    INITIAL_HISTORY_NAVIGATION,
  );
  const offsets = useRef<Partial<Record<HistoryScreen, number>>>({});

  const openAll = useCallback(() => dispatch({ type: 'openAll' }), []);
  const openMonth = useCallback(
    (month: MonthPeriod) => dispatch({ type: 'openMonth', month }),
    [],
  );
  const changeWindow = useCallback(
    (index: number, windowCount: number) =>
      dispatch({ type: 'changeWindow', index, windowCount }),
    [],
  );
  const pickMonth = useCallback(
    (id: string) => dispatch({ type: 'pickMonth', id }),
    [],
  );
  const reset = useCallback(() => {
    offsets.current = {};
    dispatch({ type: 'reset' });
  }, []);
  const rememberOffset = useCallback(
    (screen: HistoryScreen, offset: number) => {
      offsets.current[screen] = offset;
    },
    [],
  );
  // The detail always opens at its top.
  const takeOffset = useCallback(
    (screen: HistoryScreen) =>
      screen === 'detail' ? null : offsets.current[screen] ?? null,
    [],
  );

  const back = () => {
    if (historyBack(state).closes) {
      onClose();
    } else {
      dispatch({ type: 'back' });
    }
  };

  return {
    state,
    screen: currentScreen(state),
    openAll,
    openMonth,
    back,
    changeWindow,
    pickMonth,
    reset,
    rememberOffset,
    takeOffset,
  };
}

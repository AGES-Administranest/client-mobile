import type { MonthPeriod } from 'shared/utils/monthPeriod';

// What is on screen: the history, "Todos os meses", or a month's detail.
export type HistoryScreen = 'history' | 'all' | 'detail';

export type HistoryNavigationState = {
  // The view underneath: the history or "Todos os meses". The month detail,
  // when there is one, sits on top of it and back returns to this view.
  view: 'history' | 'all';
  detailMonth: MonthPeriod | null;
  // Where the history stands (the window of the chart and the month it points
  // at), kept while other views are open.
  windowIndex: number;
  pickedId: string | null;
};

export type HistoryNavigationAction =
  | { type: 'openAll' }
  | { type: 'openMonth'; month: MonthPeriod }
  | { type: 'back' }
  // `windowCount` is how many windows the history has: the index never goes
  // past them, nor before the first.
  | { type: 'changeWindow'; index: number; windowCount: number }
  | { type: 'pickMonth'; id: string }
  | { type: 'reset' };

export const INITIAL_HISTORY_NAVIGATION: HistoryNavigationState = {
  view: 'history',
  detailMonth: null,
  windowIndex: 0,
  pickedId: null,
};

export function currentScreen({
  view,
  detailMonth,
}: HistoryNavigationState): HistoryScreen {
  return detailMonth ? 'detail' : view;
}

export function clampWindowIndex(index: number, windowCount: number): number {
  return Math.min(Math.max(index, 0), Math.max(windowCount - 1, 0));
}

// Each screen steps back to the one it was opened from: the month detail to
// its view, "Todos os meses" to the history, and the history closes.
export function historyBack(state: HistoryNavigationState): {
  state: HistoryNavigationState;
  closes: boolean;
} {
  if (state.detailMonth) {
    return { state: { ...state, detailMonth: null }, closes: false };
  }
  if (state.view === 'all') {
    return { state: { ...state, view: 'history' }, closes: false };
  }
  return { state, closes: true };
}

export function historyNavigationReducer(
  state: HistoryNavigationState,
  action: HistoryNavigationAction,
): HistoryNavigationState {
  switch (action.type) {
    case 'openAll':
      return { ...state, view: 'all' };
    case 'openMonth':
      return { ...state, detailMonth: action.month };
    case 'back':
      return historyBack(state).state;
    case 'changeWindow':
      return {
        ...state,
        windowIndex: clampWindowIndex(action.index, action.windowCount),
        pickedId: null,
      };
    case 'pickMonth':
      return { ...state, pickedId: action.id };
    case 'reset':
      return INITIAL_HISTORY_NAVIGATION;
  }
}

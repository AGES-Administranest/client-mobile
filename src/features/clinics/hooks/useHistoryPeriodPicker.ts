import { useCallback, useState } from 'react';

import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import { monthPeriodOf, type HistoryPeriod } from '../domain/clientHistory';

export type HistoryPeriodPickerState = {
  isOpen: boolean;
  draft: CalendarRange;
  canApply: boolean;
  toggle: () => void;
  choose: (range: CalendarRange) => void;
  apply: () => void;
  showCurrentMonth: () => void;
  close: () => void;
};

export function useHistoryPeriodPicker(
  period: HistoryPeriod,
  onApply: (period: HistoryPeriod) => void,
): HistoryPeriodPickerState {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarRange>(period);

  const toggle = useCallback(() => {
    setDraft(period);
    setIsOpen(open => !open);
  }, [period]);

  const apply = useCallback(() => {
    if (draft.from === null || draft.to === null) {
      return;
    }
    onApply({ from: draft.from, to: draft.to });
    setIsOpen(false);
  }, [draft, onApply]);

  const showCurrentMonth = useCallback(() => {
    onApply(monthPeriodOf(new Date()));
    setIsOpen(false);
  }, [onApply]);

  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    draft,
    canApply: isRangeComplete(draft),
    toggle,
    choose: setDraft,
    apply,
    showCurrentMonth,
    close,
  };
}

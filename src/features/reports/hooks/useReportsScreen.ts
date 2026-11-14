import { useState } from 'react';

import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import {
  reportPeriodFor,
  reportToday,
  type ReportPeriodChoice,
} from '../domain/reportPeriod';

export type ReportsScreenState = {
  choice: ReportPeriodChoice;
  selectChoice: (choice: ReportPeriodChoice) => void;
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  maxDate: string;
  canGenerate: boolean;
};

export function useReportsScreen(): ReportsScreenState {
  const [choice, setChoice] = useState<ReportPeriodChoice>('currentMonth');
  const [customRange, setRange] = useState<CalendarRange>({
    from: null,
    to: null,
  });

  // The shortcuts are worked out on every render, so "Mês atual" follows the
  // calendar even when the tab stays open across midnight or a month change.
  const now = new Date();
  const range =
    choice === 'custom' ? customRange : reportPeriodFor(choice, now);

  // "Personalizado" starts from the period that was showing, so the calendar
  // opens on it instead of empty.
  const selectChoice = (next: ReportPeriodChoice) => {
    if (next === 'custom' && choice !== 'custom') {
      setRange(range);
    }
    setChoice(next);
  };

  return {
    choice,
    selectChoice,
    range,
    setRange,
    maxDate: reportToday(now),
    canGenerate: isRangeComplete(range),
  };
}

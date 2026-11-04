import { useCallback, useState } from 'react';

import type { CalendarRange } from 'shared/utils/calendar';

import {
  isReportPeriodReady,
  reportPeriodFor,
  type ReportPeriodChoice,
} from '../domain/reportPeriod';

export type ReportsScreenState = {
  choice: ReportPeriodChoice;
  selectChoice: (choice: ReportPeriodChoice) => void;
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  canGenerate: boolean;
};

export function useReportsScreen(): ReportsScreenState {
  const [choice, setChoice] = useState<ReportPeriodChoice>('currentMonth');
  const [range, setRange] = useState<CalendarRange>(() =>
    reportPeriodFor('currentMonth', new Date()),
  );

  // "Personalizado" starts from the period that was showing, so the calendar
  // opens on it instead of empty.
  const selectChoice = useCallback((next: ReportPeriodChoice) => {
    setChoice(next);
    if (next !== 'custom') {
      setRange(reportPeriodFor(next, new Date()));
    }
  }, []);

  return {
    choice,
    selectChoice,
    range,
    setRange,
    canGenerate: isReportPeriodReady(range),
  };
}

import { useState } from 'react';

import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import {
  useReportAvailability,
  type ReportAvailabilityNotice,
} from './useReportAvailability';
import {
  reportPeriodFor,
  reportToday,
  validateReportPeriod,
  type ReportPeriodChoice,
  type ReportPeriodError,
} from '../domain/reportPeriod';

export type ReportsScreenState = {
  choice: ReportPeriodChoice;
  selectChoice: (choice: ReportPeriodChoice) => void;
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  maxDate: string;
  periodError: ReportPeriodError | null;
  notice: ReportAvailabilityNotice | null;
  isChecking: boolean;
  canGenerate: boolean;
  /** Resolves `true` only when the period on screen can go on to a report. */
  checkPeriod: () => Promise<boolean>;
};

export function useReportsScreen(): ReportsScreenState {
  const [choice, setChoice] = useState<ReportPeriodChoice>('currentMonth');
  const [customRange, setCustomRange] = useState<CalendarRange>({
    from: null,
    to: null,
  });
  const availability = useReportAvailability();

  // The shortcuts are worked out on every render, so "Mês atual" follows the
  // calendar even when the tab stays open across midnight or a month change.
  const now = new Date();
  const range =
    choice === 'custom' ? customRange : reportPeriodFor(choice, now);
  const periodError = validateReportPeriod(range);

  // A notice or a check in progress speaks of the period it was asked for;
  // once the period changes it would describe one that is no longer on screen.
  const selectChoice = (next: ReportPeriodChoice) => {
    availability.reset();
    // "Personalizado" starts from the period that was showing, so the calendar
    // opens on it instead of empty.
    if (next === 'custom' && choice !== 'custom') {
      setCustomRange(range);
    }
    setChoice(next);
  };

  const setRange = (next: CalendarRange) => {
    availability.reset();
    setCustomRange(next);
  };

  const checkPeriod = async () => {
    if (range.from === null || range.to === null || periodError !== null) {
      return false;
    }

    return availability.ensureRecords({ from: range.from, to: range.to });
  };

  return {
    choice,
    selectChoice,
    range,
    setRange,
    maxDate: reportToday(now),
    periodError,
    notice: availability.notice,
    isChecking: availability.isChecking,
    canGenerate:
      isRangeComplete(range) &&
      periodError === null &&
      !availability.isChecking,
    checkPeriod,
  };
}

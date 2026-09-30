import { calculateHoursWorked } from './appointmentHours';

describe('calculateHoursWorked', () => {
  it('computes hours, minutes and value/hour from start, end and amount', () => {
    const result = calculateHoursWorked(
      '2026-01-01T14:00:00.000Z',
      '2026-01-01T15:30:00.000Z',
      '620',
    );

    expect(result.hours).toBeCloseTo(1.5);
    expect(result.minutes).toBeCloseTo(90);
    expect(result.valuePerHour).toBeCloseTo(413.333, 2);
  });

  it('returns null value/hour when the appointment has no billed amount', () => {
    const result = calculateHoursWorked(
      '2026-01-01T14:00:00.000Z',
      '2026-01-01T15:30:00.000Z',
      null,
    );

    expect(result.valuePerHour).toBeNull();
  });

  it('returns null value/hour when the duration is zero', () => {
    const result = calculateHoursWorked(
      '2026-01-01T14:00:00.000Z',
      '2026-01-01T14:00:00.000Z',
      '620',
    );

    expect(result.valuePerHour).toBeNull();
  });

  it('clamps a negative duration (endsAt before startsAt) to zero', () => {
    const result = calculateHoursWorked(
      '2026-01-01T15:00:00.000Z',
      '2026-01-01T14:00:00.000Z',
      '620',
    );

    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.valuePerHour).toBeNull();
  });
});

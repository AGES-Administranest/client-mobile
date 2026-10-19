import {
  suggestReschedule,
  toReschedulePayload,
  validateReschedule,
  type RescheduleValues,
} from './reschedule';

// 29/09/2026 14:00–15:30 no fuso local.
const STARTS = new Date(2026, 8, 29, 14, 0).toISOString();
const ENDS = new Date(2026, 8, 29, 15, 30).toISOString();
const NOW = new Date(2026, 8, 29, 16, 0);

const valid: RescheduleValues = {
  date: '30/09/2026',
  startTime: '14:00',
  endTime: '15:30',
};

describe('suggestReschedule', () => {
  it('sugere o dia seguinte no mesmo horário', () => {
    expect(suggestReschedule(STARTS, ENDS)).toEqual(valid);
  });

  it('sem fim salvo, sugere uma hora de duração', () => {
    expect(suggestReschedule(STARTS, null)).toEqual({
      ...valid,
      endTime: '15:00',
    });
  });

  it('vira o mês quando precisa', () => {
    const lastDay = new Date(2026, 8, 30, 9, 5).toISOString();
    expect(suggestReschedule(lastDay, null).date).toBe('01/10/2026');
  });
});

describe('validateReschedule', () => {
  it('não acusa nada numa data futura válida', () => {
    expect(validateReschedule(valid, NOW)).toEqual({});
  });

  it('exige os três campos', () => {
    expect(
      validateReschedule({ date: '', startTime: ' ', endTime: '' }, NOW),
    ).toEqual({
      date: 'REQUIRED',
      startTime: 'REQUIRED',
      endTime: 'REQUIRED',
    });
  });

  it.each([
    [{ date: '31/02/2026' }, 'date', 'INVALID_DATE'],
    [{ startTime: '25:00' }, 'startTime', 'INVALID_TIME'],
    [{ endTime: '14:00' }, 'endTime', 'END_BEFORE_START'],
    [{ date: '29/09/2026', startTime: '15:00' }, 'date', 'IN_THE_PAST'],
  ] as const)('%j -> %s %s', (change, field, code) => {
    expect(validateReschedule({ ...valid, ...change }, NOW)[field]).toBe(code);
  });
});

describe('toReschedulePayload', () => {
  it('manda início e fim em ISO', () => {
    expect(toReschedulePayload(valid)).toEqual({
      startsAt: new Date(2026, 8, 30, 14, 0).toISOString(),
      endsAt: new Date(2026, 8, 30, 15, 30).toISOString(),
    });
  });
});

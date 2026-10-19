import {
  formatAppointmentSchedule,
  formatAppointmentTime,
  formatAsaLabel,
  getAppointmentDateKey,
  groupAppointmentsByDate,
  isSameDay,
  type Appointment,
} from './appointment';

describe('appointment domain utils', () => {
  describe('getAppointmentDateKey', () => {
    it('extracts YYYY-MM-DD from an ISO string', () => {
      expect(getAppointmentDateKey('2026-09-17T14:30:00.000Z')).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    });
  });

  describe('groupAppointmentsByDate', () => {
    it('returns an empty object when given an empty array', () => {
      const result = groupAppointmentsByDate([]);
      expect(result).toEqual({});
    });

    it('groups and sorts appointments by date correctly', () => {
      const appointments: Appointment[] = [
        {
          id: 'app-2',
          patientName: 'Thor',
          status: 'SCHEDULED',
          startsAt: '2026-09-17T15:00:00.000Z',
        },
        {
          id: 'app-1',
          patientName: 'Mel',
          status: 'SCHEDULED',
          startsAt: '2026-09-17T09:00:00.000Z',
        },
        {
          id: 'app-3',
          patientName: 'Luna',
          status: 'SCHEDULED',
          startsAt: '2026-09-18T10:00:00.000Z',
        },
      ];

      const grouped = groupAppointmentsByDate(appointments);
      const keys = Object.keys(grouped);

      expect(keys.length).toBe(2);
      // Verify chronological sorting for the first day
      const day1Apps =
        grouped[getAppointmentDateKey('2026-09-17T09:00:00.000Z')];
      expect(day1Apps).toBeDefined();
      expect(day1Apps[0].id).toBe('app-1');
      expect(day1Apps[1].id).toBe('app-2');
    });
  });

  describe('formatAppointmentSchedule', () => {
    // Datas locais: o card mostra a hora no fuso do aparelho.
    const start = new Date(2026, 8, 30, 15, 0).toISOString();
    const end = new Date(2026, 8, 30, 16, 30).toISOString();

    it.each([
      ['início e fim, sem data', start, end, false, '15:00 – 16:30'],
      ['só o início, sem data', start, null, false, '15:00'],
      ['início e fim, com data', start, end, true, '30 set · 15:00 – 16:30'],
      ['só o início, com data', start, undefined, true, '30 set · 15:00'],
    ])('%s', (_label, startsAt, endsAt, withDate, expected) => {
      expect(
        formatAppointmentSchedule(startsAt, endsAt, {
          withDate,
          locale: 'pt-BR',
        }),
      ).toBe(expected);
    });
  });

  describe('formatAppointmentTime', () => {
    it('formats single start time', () => {
      const formatted = formatAppointmentTime('2026-09-17T14:30:00.000Z');
      expect(formatted).toBeTruthy();
      expect(formatted).not.toContain('-');
    });

    it('formats start and end time range', () => {
      const formatted = formatAppointmentTime(
        '2026-09-17T14:30:00.000Z',
        '2026-09-17T16:00:00.000Z',
      );
      expect(formatted).toContain('-');
    });
  });

  describe('isSameDay', () => {
    it('returns true when dates match', () => {
      expect(isSameDay('2026-09-17', '2026-09-17')).toBe(true);
    });

    it('returns false when dates differ', () => {
      expect(isSameDay('2026-09-17', '2026-09-18')).toBe(false);
    });
  });

  describe('formatAsaLabel', () => {
    it.each([
      ['II', 'ASA II'],
      ['ASA III', 'ASA III'],
      ['asa iv', 'ASA IV'],
      ['  I ', 'ASA I'],
    ])('reads %p as %p', (asa, label) => {
      expect(formatAsaLabel(asa)).toBe(label);
    });
  });
});

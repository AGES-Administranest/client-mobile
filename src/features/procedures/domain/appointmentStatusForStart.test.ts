import { appointmentStatusForStart } from './appointmentStatusForStart';

const NOW = new Date(2026, 8, 29, 14, 0, 0, 0);

describe('appointmentStatusForStart', () => {
  it.each([
    ['um minuto depois de agora', new Date(2026, 8, 29, 14, 1), 'SCHEDULED'],
    ['amanhã', new Date(2026, 8, 30, 9, 0), 'SCHEDULED'],
    ['exatamente agora', new Date(2026, 8, 29, 14, 0), 'COMPLETED'],
    ['um minuto antes de agora', new Date(2026, 8, 29, 13, 59), 'COMPLETED'],
    ['ontem', new Date(2026, 8, 28, 9, 0), 'COMPLETED'],
  ])('começo %s vira %s', (_label, startsAt, expected) => {
    expect(appointmentStatusForStart(startsAt, NOW)).toBe(expected);
  });
});

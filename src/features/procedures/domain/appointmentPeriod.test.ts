import { hasActivePeriod, toAppointmentPeriod } from './appointmentPeriod';

describe('toAppointmentPeriod', () => {
  it('não filtra nada sem período escolhido', () => {
    expect(toAppointmentPeriod({ from: null, to: null })).toEqual({});
  });

  it('começa no primeiro instante do dia inicial', () => {
    expect(toAppointmentPeriod({ from: '2026-08-06', to: null })).toEqual({
      from: new Date(2026, 7, 6, 0, 0, 0, 0).toISOString(),
    });
  });

  it('só manda `to` quando o intervalo foi fechado', () => {
    expect(
      toAppointmentPeriod({ from: '2026-08-06', to: null }),
    ).not.toHaveProperty('to');
  });

  it('termina no último milissegundo do dia final, para o backend não perdê-lo', () => {
    expect(
      toAppointmentPeriod({ from: '2026-08-06', to: '2026-08-08' }),
    ).toEqual({
      from: new Date(2026, 7, 6, 0, 0, 0, 0).toISOString(),
      to: new Date(2026, 7, 8, 23, 59, 59, 999).toISOString(),
    });
  });

  it('um único dia cobre o dia inteiro', () => {
    const { from, to } = toAppointmentPeriod({
      from: '2026-08-06',
      to: '2026-08-06',
    });

    expect(new Date(to!).getTime() - new Date(from!).getTime()).toBe(
      24 * 60 * 60 * 1000 - 1,
    );
  });

  it('cruza virada de mês e de ano sem deslocar o dia', () => {
    expect(
      toAppointmentPeriod({ from: '2026-12-31', to: '2027-01-01' }),
    ).toEqual({
      from: new Date(2026, 11, 31, 0, 0, 0, 0).toISOString(),
      to: new Date(2027, 0, 1, 23, 59, 59, 999).toISOString(),
    });
  });
});

describe('hasActivePeriod', () => {
  it.each([
    [{ from: null, to: null }, false],
    [{ from: '2026-08-06', to: null }, true],
    [{ from: '2026-08-06', to: '2026-08-08' }, true],
  ])('%j → %s', (range, expected) => {
    expect(hasActivePeriod(range)).toBe(expected);
  });
});

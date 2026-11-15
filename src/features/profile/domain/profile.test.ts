import {
  calculateAge,
  displayValue,
  isMissingCrmv,
  type Profile,
} from './profile';

const PROFILE: Profile = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  crmv: null,
  birthDate: null,
  sex: null,
  city: null,
  state: null,
};

describe('calculateAge', () => {
  it.each([
    ['birthday today', '1990-04-15T00:00:00.000Z', '2026-04-15', 36],
    ['birthday tomorrow', '1990-04-16T00:00:00.000Z', '2026-04-15', 35],
    ['birthday yesterday', '1990-04-14T00:00:00.000Z', '2026-04-15', 36],
    [
      'birthday later in the year',
      '1990-11-02T00:00:00.000Z',
      '2026-04-15',
      35,
    ],
    [
      'born on 29/02, day before in a common year',
      '2000-02-29T00:00:00.000Z',
      '2026-02-28',
      25,
    ],
    [
      'born on 29/02, day after in a common year',
      '2000-02-29T00:00:00.000Z',
      '2026-03-01',
      26,
    ],
    [
      'born on 29/02, on the day in a leap year',
      '2000-02-29T00:00:00.000Z',
      '2028-02-29',
      28,
    ],
    ['born today', '2026-04-15T00:00:00.000Z', '2026-04-15', 0],
  ])('%s', (_case, birthDate, today, age) => {
    expect(calculateAge(birthDate, today)).toBe(age);
  });

  it('reads only the date part, which is what the API stores', () => {
    expect(calculateAge('1990-04-15T23:59:59.000Z', '2026-04-15')).toBe(36);
  });

  it.each([
    ['no birth date', null],
    ['an empty birth date', ''],
    ['a birth date after today', '2026-04-16T00:00:00.000Z'],
    ['a value that is not a date', 'not-a-date'],
  ])('gives no age for %s', (_case, birthDate) => {
    expect(calculateAge(birthDate, '2026-04-15')).toBeNull();
  });
});

describe('displayValue', () => {
  it.each([
    ['null', null],
    ['an empty string', ''],
    ['only spaces', '   '],
  ])('falls back for %s', (_case, value) => {
    expect(displayValue(value, 'Não informado')).toBe('Não informado');
  });

  it('keeps a filled-in value, without the surrounding spaces', () => {
    expect(displayValue(' Porto Alegre ', 'Não informado')).toBe(
      'Porto Alegre',
    );
  });
});

describe('isMissingCrmv', () => {
  it.each([
    ['null', null, true],
    ['empty', '', true],
    ['only spaces', '   ', true],
    ['filled in', 'RS-12345', false],
  ])('%s', (_case, crmv, missing) => {
    expect(isMissingCrmv({ ...PROFILE, crmv })).toBe(missing);
  });
});

import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['first and last name', 'Eduardo Ferrari', 'EF'],
    ['a middle name, which is skipped', 'Ana Maria Souza', 'AS'],
    ['a single name', 'Eduardo', 'E'],
    ['lower case', 'ana souza', 'AS'],
    ['extra spaces', '  Ana   Souza  ', 'AS'],
    ['nothing', '', ''],
  ])('%s', (_case, name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

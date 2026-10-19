import { normalizeForSearch } from './search';

describe('normalizeForSearch', () => {
  it.each([
    ['Clínica', 'clinica'],
    ['São João', 'sao joao'],
    ['Ação', 'acao'],
    ['Manutenção', 'manutencao'],
    ['Café', 'cafe'],
  ])('drops the accents of %j → %j', (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });

  it.each([
    ['IMPOSTOS', 'impostos'],
    ['VetCenter', 'vetcenter'],
    ['abc', 'abc'],
  ])('ignores the case of %j → %j', (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });

  it.each([
    ['  ÁGUAS  ', 'aguas'],
    ['\tInsumos\n', 'insumos'],
    ['Custos fixos', 'custos fixos'],
    ['   ', ''],
  ])(
    'trims the edges of %j and keeps the inner spaces → %j',
    (input, expected) => {
      expect(normalizeForSearch(input)).toBe(expected);
    },
  );

  it('makes an accented and an unaccented spelling equal', () => {
    expect(normalizeForSearch('Clínica Vida Animal')).toBe(
      normalizeForSearch('CLINICA VIDA ANIMAL'),
    );
  });
});

import { formatClientAddress } from './formatClientAddress';

describe('formatClientAddress', () => {
  it('junta endereço, cidade e UF', () => {
    expect(
      formatClientAddress({
        addressLine: 'Rua das Hortênsias, 340 — Jardim Europa',
        city: 'São Paulo',
        state: 'SP',
      }),
    ).toBe('Rua das Hortênsias, 340 — Jardim Europa, São Paulo, SP');
  });

  it('ignora partes nulas, vazias ou só com espaços', () => {
    expect(
      formatClientAddress({
        addressLine: null,
        city: 'Porto Alegre',
        state: '  ',
      }),
    ).toBe('Porto Alegre');
  });

  it('devolve string vazia para tomador sem endereço', () => {
    expect(formatClientAddress({})).toBe('');
    expect(
      formatClientAddress({ addressLine: null, city: null, state: null }),
    ).toBe('');
  });

  it('remove espaços nas pontas de cada parte', () => {
    expect(
      formatClientAddress({
        addressLine: ' Rua X, 10 ',
        city: ' Canoas ',
        state: ' RS ',
      }),
    ).toBe('Rua X, 10, Canoas, RS');
  });
});
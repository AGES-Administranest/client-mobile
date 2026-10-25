import { toDuplicateSummary } from './duplicateSummary';

describe('toDuplicateSummary', () => {
  it('formats the date and amount in pt-BR', () => {
    const summary = toDuplicateSummary({
      id: 'n-1',
      number: ' 2026/0042 ',
      issueDate: '2026-03-15',
      amount: 1850,
      clientName: 'Clínica Sul',
    });

    expect(summary.number).toBe('2026/0042');
    expect(summary.issueDate).toBe('15/03/2026');
    expect(summary.amount.replace(/\s/g, ' ')).toBe('R$ 1.850,00');
    expect(summary.clientName).toBe('Clínica Sul');
  });

  it('leaves the number empty when the note has none', () => {
    expect(
      toDuplicateSummary({
        id: 'n-1',
        issueDate: '2026-03-15',
        amount: 10.5,
        clientName: 'X',
      }).number,
    ).toBe('');
  });

  it('keeps a malformed date as it came', () => {
    expect(
      toDuplicateSummary({
        id: 'n-1',
        issueDate: 'ontem',
        amount: 1,
        clientName: 'X',
      }).issueDate,
    ).toBe('ontem');
  });
});

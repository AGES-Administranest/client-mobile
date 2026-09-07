import {
  calculateExpiryAlerts,
  isExpiringSoon,
  ExpiringItem,
} from './expiryAlert';

const today = new Date(2026, 8, 6, 12);

function item(id: string, daysFromToday: number): ExpiringItem {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromToday);

  return {
    id,
    name: id,
    expirationDate: date.toISOString().slice(0, 10),
  };
}

describe('isExpiringSoon', () => {
  it('ignora itens já vencidos', () => {
    expect(isExpiringSoon(item('propofol', -1), today)).toBe(false);
  });

  it('alerta um item que vence hoje', () => {
    expect(isExpiringSoon(item('propofol', 0), today)).toBe(true);
  });

  it('alerta até o limite de 30 dias', () => {
    expect(isExpiringSoon(item('propofol', 30), today)).toBe(true);
  });

  it('ignora itens que vencem depois da janela', () => {
    expect(isExpiringSoon(item('propofol', 31), today)).toBe(false);
  });
});

describe('calculateExpiryAlerts', () => {
  it('separa alertas novos e mantém apenas os itens ainda na janela', () => {
    const result = calculateExpiryAlerts(
      [item('propofol', 2), item('cetamina', 10), item('midazolam', 31)],
      ['propofol'],
      today,
    );

    expect(result.newAlerts.map(alert => alert.id)).toEqual(['cetamina']);
    expect(result.notifiedIds).toEqual(['propofol', 'cetamina']);
  });

  it('rearma um item que sai da janela', () => {
    const result = calculateExpiryAlerts(
      [item('propofol', 31)],
      ['propofol'],
      today,
    );

    expect(result.newAlerts).toEqual([]);
    expect(result.notifiedIds).toEqual([]);
  });
});

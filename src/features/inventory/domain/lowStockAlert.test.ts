import {
  calculateAlerts,
  isAtOrBelowMinimum,
  MonitoredItem,
} from './lowStockAlert';

function item(id: string, quantity: number, minimum = 5): MonitoredItem {
  return { id, name: id, unit: 'frasco', quantity, minimumStock: minimum };
}

describe('isAtOrBelowMinimum', () => {
  it('é falso acima do mínimo', () => {
    expect(isAtOrBelowMinimum(item('propofol', 6))).toBe(false);
  });

  // A fronteira do CA2: "atingir ou ficar abaixo" — o saldo igual já conta.
  it('é verdadeiro ao atingir exatamente o mínimo', () => {
    expect(isAtOrBelowMinimum(item('propofol', 5))).toBe(true);
  });

  it('é verdadeiro abaixo do mínimo', () => {
    expect(isAtOrBelowMinimum(item('propofol', 4))).toBe(true);
  });

  it('é verdadeiro abaixo do mínimo e com saldo zerado', () => {
    expect(isAtOrBelowMinimum(item('propofol', 4))).toBe(true);
    expect(isAtOrBelowMinimum(item('propofol', 0))).toBe(true);
  });

  // Com mínimo zero, só o saldo zerado atinge o mínimo.
  it('com mínimo zero só é crítico quando zera', () => {
    expect(isAtOrBelowMinimum(item('propofol', 1, 0))).toBe(false);
    expect(isAtOrBelowMinimum(item('propofol', 0, 0))).toBe(true);
  });
});

describe('calculateAlerts', () => {
  it('alerta um item que acabou de entrar em estoque mínimo', () => {
    const { newAlerts, notifiedIds } = calculateAlerts(
      [item('propofol', 4)],
      [],
    );

    expect(newAlerts.map(i => i.id)).toEqual(['propofol']);
    expect(notifiedIds).toEqual(['propofol']);
  });

  // O ponto central da regra: não repetir alerta a cada nova baixa.
  it('não repete o alerta de um item que já estava crítico', () => {
    const { newAlerts, notifiedIds } = calculateAlerts(
      [item('propofol', 2)],
      ['propofol'],
    );

    expect(newAlerts).toEqual([]);
    expect(notifiedIds).toEqual(['propofol']);
  });

  it('rearma o item que volta a ficar acima do mínimo', () => {
    const { newAlerts, notifiedIds } = calculateAlerts(
      [item('propofol', 12)],
      ['propofol'],
    );

    expect(newAlerts).toEqual([]);
    expect(notifiedIds).toEqual([]);
  });

  it('separa os que entram agora dos que já haviam notificado', () => {
    const { newAlerts, notifiedIds } = calculateAlerts(
      [item('propofol', 2), item('cetamina', 1), item('midazolam', 40)],
      ['propofol'],
    );

    expect(newAlerts.map(i => i.id)).toEqual(['cetamina']);
    expect(notifiedIds).toEqual(['propofol', 'cetamina']);
  });

  it('devolve listas vazias quando nada está crítico', () => {
    const { newAlerts, notifiedIds } = calculateAlerts(
      [item('propofol', 30)],
      [],
    );

    expect(newAlerts).toEqual([]);
    expect(notifiedIds).toEqual([]);
  });

  it('ignora ids notificados de itens que não existem mais', () => {
    const { notifiedIds } = calculateAlerts(
      [item('propofol', 2)],
      ['item-removido', 'propofol'],
    );

    expect(notifiedIds).toEqual(['propofol']);
  });
});

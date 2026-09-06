import { buildAlertMessage } from './alertMessage';
import { MonitoredItem } from './lowStockAlert';

function item(name: string, quantity = 2): MonitoredItem {
  return {
    id: name.toLowerCase(),
    name,
    unit: 'frasco',
    quantity,
    minimumStock: 5,
  };
}

describe('buildAlertMessage', () => {
  it('não monta mensagem sem alertas', () => {
    expect(buildAlertMessage([])).toBeNull();
  });

  it('usa a forma singular com um item e leva o saldo nos params', () => {
    const message = buildAlertMessage([item('Propofol', 3)]);

    expect(message).toEqual({
      titleKey: 'inventory.alert.titleSingular',
      bodyKey: 'inventory.alert.bodySingular',
      params: {
        name: 'Propofol',
        quantity: 3,
        unit: 'frasco',
        minimum: 5,
      },
    });
  });

  it('agrupa dois ou mais itens em uma única mensagem', () => {
    const message = buildAlertMessage([item('Propofol'), item('Cetamina')]);

    expect(message?.titleKey).toBe('inventory.alert.titlePlural');
    expect(message?.bodyKey).toBe('inventory.alert.bodyPlural');
    expect(message?.params).toEqual({
      total: 2,
      items: 'Propofol, Cetamina',
      remaining: 0,
    });
  });

  // Fronteira do truncamento: três cabem, o quarto vira "e mais N".
  it('lista até três itens sem truncar', () => {
    const message = buildAlertMessage([
      item('Propofol'),
      item('Cetamina'),
      item('Midazolam'),
    ]);

    expect(message?.bodyKey).toBe('inventory.alert.bodyPlural');
    expect(message?.params.items).toBe('Propofol, Cetamina, Midazolam');
    expect(message?.params.remaining).toBe(0);
  });

  it('trunca a partir do quarto item', () => {
    const message = buildAlertMessage([
      item('Propofol'),
      item('Cetamina'),
      item('Midazolam'),
      item('Cateter 22G'),
      item('Sonda 3.0'),
    ]);

    expect(message?.bodyKey).toBe('inventory.alert.bodyPluralTruncated');
    expect(message?.params.items).toBe('Propofol, Cetamina, Midazolam');
    expect(message?.params.remaining).toBe(2);
    expect(message?.params.total).toBe(5);
  });
});

import { ExpiringItem } from './expiryAlert';
import { buildExpiryAlertMessage } from './expiryAlertMessage';

function item(name: string): ExpiringItem {
  return { id: name, name, expirationDate: '2026-09-10' };
}

describe('buildExpiryAlertMessage', () => {
  // Regressão: a notificação do SO dizia "vence em 2026-09-20" enquanto o
  // card da lista dizia "20/09/2026".
  it('usa o mesmo formato de data que o card mostra', () => {
    const message = buildExpiryAlertMessage([
      { id: 'dipirona', name: 'Dipirona', expirationDate: '2026-09-20' },
    ]);

    expect(message?.params.expirationDate).toBe('20/09/2026');
  });

  it('não monta mensagem sem alertas', () => {
    expect(buildExpiryAlertMessage([])).toBeNull();
  });

  it('usa a forma singular com a data de validade', () => {
    expect(buildExpiryAlertMessage([item('Propofol')])).toEqual({
      titleKey: 'inventory.expiryAlert.titleSingular',
      bodyKey: 'inventory.expiryAlert.bodySingular',
      params: { name: 'Propofol', expirationDate: '10/09/2026' },
    });
  });

  it('agrupa e trunca a lista de itens', () => {
    const message = buildExpiryAlertMessage([
      item('Propofol'),
      item('Cetamina'),
      item('Midazolam'),
      item('Fentanila'),
    ]);

    expect(message?.titleKey).toBe('inventory.expiryAlert.titlePlural');
    expect(message?.bodyKey).toBe('inventory.expiryAlert.bodyPluralTruncated');
    expect(message?.params).toEqual({
      total: 4,
      items: 'Propofol, Cetamina, Midazolam',
      remaining: 1,
    });
  });
});

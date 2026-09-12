import type { ExpiringLot, IsoDate } from './expiryAlert';
import {
  activeAlertKeys,
  buildInventoryNotifications,
  expiryKey,
  lowStockKey,
  reconcileAlertTimestamps,
  reconcileDismissedAlerts,
} from './inventoryNotifications';
import type { MonitoredItem } from './lowStockAlert';

const NOW = new Date(2026, 8, 13, 10, 0);
const NOW_MS = NOW.getTime();
const MINUTE = 60 * 1000;

function item(
  id: string,
  { quantity = 50, minimumStock = 10 } = {},
): MonitoredItem {
  return { id, name: id, unit: 'frasco', quantity, minimumStock };
}

function lot(id: string, itemId: string, expiresInDays = 400): ExpiringLot {
  const expiration = new Date(NOW);
  expiration.setDate(expiration.getDate() + expiresInDays);
  const month = String(expiration.getMonth() + 1).padStart(2, '0');
  const day = String(expiration.getDate()).padStart(2, '0');
  return {
    id,
    itemId,
    name: itemId,
    expirationDate: `${expiration.getFullYear()}-${month}-${day}` as IsoDate,
  };
}

describe('activeAlertKeys', () => {
  it('não gera alerta para estoque e lotes saudáveis', () => {
    expect(activeAlertKeys([item('propofol')], [], NOW)).toEqual([]);
  });

  it('gera estoque por item e validade por lote', () => {
    expect(
      activeAlertKeys(
        [item('propofol', { quantity: 2 })],
        [lot('lote-a', 'propofol', 3)],
        NOW,
      ),
    ).toEqual([lowStockKey('propofol'), expiryKey('lote-a')]);
  });

  it('não colide dois lotes do mesmo item', () => {
    expect(
      activeAlertKeys(
        [item('propofol')],
        [lot('lote-a', 'propofol', 2), lot('lote-b', 'propofol', 5)],
        NOW,
      ),
    ).toEqual([expiryKey('lote-a'), expiryKey('lote-b')]);
  });
});

describe('reconcileAlertTimestamps', () => {
  it('carimba novo, preserva ativo e descarta resolvido', () => {
    const before = NOW_MS - 30 * MINUTE;
    expect(
      reconcileAlertTimestamps(
        ['lowStock:a', 'expiry:c'],
        { 'lowStock:a': before, 'expiry:b': NOW_MS },
        NOW_MS,
      ),
    ).toEqual({ 'lowStock:a': before, 'expiry:c': NOW_MS });
  });
});

describe('buildInventoryNotifications', () => {
  it('gera um card por lote e mantém vínculo com o item', () => {
    const list = buildInventoryNotifications(
      [item('propofol')],
      [lot('lote-a', 'propofol', 2), lot('lote-b', 'propofol', 5)],
      {},
      NOW,
    );

    expect(list).toHaveLength(2);
    expect(list.every(notification => notification.itemId === 'propofol')).toBe(
      true,
    );
    expect(
      list
        .filter(notification => notification.kind === 'expiry')
        .map(notification => notification.lotId)
        .sort(),
    ).toEqual(['lote-a', 'lote-b']);
  });

  it('gera estoque e validade simultaneamente sem misturar identidades', () => {
    const list = buildInventoryNotifications(
      [item('propofol', { quantity: 1 })],
      [lot('lote-a', 'propofol', 2)],
      {},
      NOW,
    );

    expect(list.map(notification => notification.key).sort()).toEqual([
      expiryKey('lote-a'),
      lowStockKey('propofol'),
    ]);
  });

  it('ordena do mais recente e calcula tempo decorrido', () => {
    const items = [
      item('antigo', { quantity: 1 }),
      item('novo', { quantity: 1 }),
    ];
    const timestamps = {
      [lowStockKey('antigo')]: NOW_MS - 600 * MINUTE,
      [lowStockKey('novo')]: NOW_MS - 90 * MINUTE,
    };
    const list = buildInventoryNotifications(items, [], timestamps, NOW);

    expect(list.map(notification => notification.name)).toEqual([
      'novo',
      'antigo',
    ]);
    expect(list[0].elapsed).toEqual({ unit: 'hours', value: 1 });
  });

  it('não lista alertas saudáveis nem dispensados', () => {
    expect(
      buildInventoryNotifications([item('saudavel')], [], {}, NOW),
    ).toEqual([]);
    expect(
      buildInventoryNotifications(
        [item('baixo', { quantity: 1 })],
        [],
        {},
        NOW,
        [lowStockKey('baixo')],
      ),
    ).toEqual([]);
  });
});

describe('reconcileDismissedAlerts', () => {
  it('mantém apenas dispensas que continuam ativas', () => {
    expect(
      reconcileDismissedAlerts(
        ['lowStock:a', 'expiry:b'],
        ['lowStock:a', 'expiry:c'],
      ),
    ).toEqual(['lowStock:a']);
  });
});

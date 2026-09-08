import type { IsoDate } from './expiryAlert';
import {
  activeAlertKeys,
  buildInventoryNotifications,
  expiryKey,
  InventoryItem,
  lowStockKey,
  reconcileAlertTimestamps,
  reconcileDismissedAlerts,
} from './inventoryNotifications';

const NOW = new Date(2026, 8, 13, 10, 0);
const NOW_MS = NOW.getTime();
const MINUTE = 60 * 1000;

function item(
  id: string,
  { quantity = 50, minimumStock = 10, expiresInDays = 400 } = {},
): InventoryItem {
  const expiration = new Date(NOW);
  expiration.setDate(expiration.getDate() + expiresInDays);

  const month = String(expiration.getMonth() + 1).padStart(2, '0');
  const day = String(expiration.getDate()).padStart(2, '0');

  return {
    id,
    name: id,
    unit: 'frasco',
    quantity,
    minimumStock,
    expirationDate: `${expiration.getFullYear()}-${month}-${day}` as IsoDate,
  };
}

describe('activeAlertKeys', () => {
  it('não gera alerta para item saudável', () => {
    expect(activeAlertKeys([item('propofol')], NOW)).toEqual([]);
  });

  // O ponto do pedido: um lote pode disparar os dois alertas ao mesmo tempo.
  it('gera os dois alertas quando o item está baixo e vencendo', () => {
    const critical = item('propofol', { quantity: 2, expiresInDays: 3 });

    expect(activeAlertKeys([critical], NOW)).toEqual([
      lowStockKey('propofol'),
      expiryKey('propofol'),
    ]);
  });
});

describe('reconcileAlertTimestamps', () => {
  it('carimba alerta novo com o instante atual', () => {
    const result = reconcileAlertTimestamps(['lowStock:a'], {}, NOW_MS);

    expect(result).toEqual({ 'lowStock:a': NOW_MS });
  });

  // Sem isso o "há X min" reiniciaria toda vez que a tela abre.
  it('preserva o carimbo de um alerta que continua ativo', () => {
    const before = NOW_MS - 30 * MINUTE;
    const result = reconcileAlertTimestamps(
      ['lowStock:a'],
      { 'lowStock:a': before },
      NOW_MS,
    );

    expect(result).toEqual({ 'lowStock:a': before });
  });

  it('descarta o carimbo de alerta que deixou de existir', () => {
    const result = reconcileAlertTimestamps(
      ['lowStock:a'],
      { 'lowStock:a': NOW_MS, 'expiry:b': NOW_MS },
      NOW_MS,
    );

    expect(result).toEqual({ 'lowStock:a': NOW_MS });
  });
});

describe('buildInventoryNotifications', () => {
  it('devolve um card por lote, não um agrupado', () => {
    const items = [
      item('cetamina', { quantity: 3, minimumStock: 5 }),
      item('midazolam', { quantity: 6, minimumStock: 12 }),
    ];

    const list = buildInventoryNotifications(items, {}, NOW);

    expect(list).toHaveLength(2);
    expect(list.map(n => n.name).sort()).toEqual(['cetamina', 'midazolam']);
  });

  it('mistura os dois tipos de alerta na mesma lista', () => {
    const items = [
      item('cetamina', { quantity: 3, minimumStock: 5 }),
      item('dipirona', { expiresInDays: 5 }),
    ];

    const list = buildInventoryNotifications(items, {}, NOW);

    expect(list.map(n => n.kind).sort()).toEqual(['expiry', 'lowStock']);
  });

  it('gera dois cards para o item que está baixo e vencendo', () => {
    const critical = item('propofol', { quantity: 1, expiresInDays: 2 });

    const list = buildInventoryNotifications([critical], {}, NOW);

    expect(list).toHaveLength(2);
    expect(list.every(n => n.itemId === 'propofol')).toBe(true);
    expect(list.map(n => n.key).sort()).toEqual([
      expiryKey('propofol'),
      lowStockKey('propofol'),
    ]);
  });

  it('ordena do alerta mais recente para o mais antigo', () => {
    const items = [
      item('antigo', { quantity: 1 }),
      item('novo', { quantity: 1 }),
    ];
    const timestamps = {
      [lowStockKey('antigo')]: NOW_MS - 600 * MINUTE,
      [lowStockKey('novo')]: NOW_MS - 5 * MINUTE,
    };

    const list = buildInventoryNotifications(items, timestamps, NOW);

    expect(list.map(n => n.name)).toEqual(['novo', 'antigo']);
  });

  it('converte o carimbo em tempo decorrido legível', () => {
    const items = [item('propofol', { quantity: 1 })];
    const timestamps = { [lowStockKey('propofol')]: NOW_MS - 90 * MINUTE };

    const [notification] = buildInventoryNotifications(items, timestamps, NOW);

    expect(notification.elapsed).toEqual({ unit: 'hours', value: 1 });
  });

  it('leva saldo e mínimo no card de estoque, validade no de vencimento', () => {
    const items = [
      item('cetamina', { quantity: 3, minimumStock: 5 }),
      item('dipirona', { expiresInDays: 5 }),
    ];

    const list = buildInventoryNotifications(items, {}, NOW);
    const lowStock = list.find(n => n.kind === 'lowStock');
    const expiry = list.find(n => n.kind === 'expiry');

    expect(lowStock).toMatchObject({ quantity: 3, minimumStock: 5 });
    expect(expiry?.expirationDate).toBe('2026-09-18');
  });

  it('não lista item saudável', () => {
    expect(buildInventoryNotifications([item('propofol')], {}, NOW)).toEqual(
      [],
    );
  });
});

describe('reconcileDismissedAlerts', () => {
  it('mantém dispensado o alerta que continua ativo', () => {
    expect(
      reconcileDismissedAlerts(['lowStock:a', 'expiry:b'], ['lowStock:a']),
    ).toEqual(['lowStock:a']);
  });

  // O rearme: item saiu do estado de alerta, então a dispensa perde o efeito.
  it('esquece a dispensa quando o alerta deixa de existir', () => {
    expect(reconcileDismissedAlerts(['expiry:b'], ['lowStock:a'])).toEqual([]);
  });
});

describe('buildInventoryNotifications com dispensa', () => {
  it('esconde o alerta apagado pelo usuário', () => {
    const items = [item('cetamina', { quantity: 3, minimumStock: 5 })];

    const list = buildInventoryNotifications(items, {}, NOW, [
      lowStockKey('cetamina'),
    ]);

    expect(list).toEqual([]);
  });

  // Apagar o aviso de validade não pode apagar o de estoque do mesmo item.
  it('apaga só o alerta dispensado, não o outro do mesmo item', () => {
    const critical = item('propofol', { quantity: 1, expiresInDays: 2 });

    const list = buildInventoryNotifications([critical], {}, NOW, [
      expiryKey('propofol'),
    ]);

    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('lowStock');
  });
});

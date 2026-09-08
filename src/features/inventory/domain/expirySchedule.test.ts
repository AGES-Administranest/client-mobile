import { ExpiringItem, IsoDate } from './expiryAlert';
import {
  EXPIRY_NOTIFICATION_HOUR,
  MAX_SCHEDULED_DATES,
  planExpirySchedule,
} from './expirySchedule';

const NOW = new Date(2026, 8, 8, 14, 30);

function isoIn(days: number): IsoDate {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}` as IsoDate;
}

function item(id: string, days: number): ExpiringItem {
  return { id, name: id, expirationDate: isoIn(days) };
}

describe('planExpirySchedule', () => {
  // O ponto central da mudança: item longe do vencimento não é ignorado,
  // ele é agendado para o futuro.
  it('agenda um item fora da janela para 7 dias antes do vencimento', () => {
    const plan = planExpirySchedule([item('propofol', 40)], [], NOW);

    expect(plan.toSchedule).toHaveLength(1);

    const { fireAt } = plan.toSchedule[0];
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 33);
    expected.setHours(EXPIRY_NOTIFICATION_HOUR, 0, 0, 0);

    expect(fireAt).toEqual(expected);
  });

  it('dispara no horário civil, não à meia-noite', () => {
    const plan = planExpirySchedule([item('propofol', 40)], [], NOW);

    expect(plan.toSchedule[0].fireAt.getHours()).toBe(EXPIRY_NOTIFICATION_HOUR);
    expect(plan.toSchedule[0].fireAt.getMinutes()).toBe(0);
  });

  // Cadastro tardio: o instante ideal já passou, mas o aviso ainda vale.
  it('agenda para daqui a pouco quando o item já está dentro da janela', () => {
    const plan = planExpirySchedule([item('propofol', 3)], [], NOW);

    expect(plan.toSchedule).toHaveLength(1);
    expect(plan.toSchedule[0].fireAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(plan.toSchedule[0].fireAt.getTime()).toBeLessThanOrEqual(
      NOW.getTime() + 60000,
    );
  });

  it('não agenda item já vencido', () => {
    const plan = planExpirySchedule([item('propofol', -1)], [], NOW);

    expect(plan.toSchedule).toEqual([]);
  });

  it('agenda item que vence hoje', () => {
    const plan = planExpirySchedule([item('propofol', 0)], [], NOW);

    expect(plan.toSchedule).toHaveLength(1);
  });

  it('agrupa numa notificação só os itens que vencem no mesmo dia', () => {
    const plan = planExpirySchedule(
      [item('propofol', 20), item('cetamina', 20), item('midazolam', 25)],
      [],
      NOW,
    );

    expect(plan.toSchedule).toHaveLength(2);

    const grouped = plan.toSchedule.find(entry => entry.items.length === 2);
    expect(grouped?.items.map(i => i.id).sort()).toEqual([
      'cetamina',
      'propofol',
    ]);
  });

  it('não reagenda o que já está agendado', () => {
    const first = planExpirySchedule([item('propofol', 20)], [], NOW);
    const second = planExpirySchedule(
      [item('propofol', 20)],
      [first.toSchedule[0].key],
      NOW,
    );

    expect(second.toSchedule).toEqual([]);
    expect(second.toCancel).toEqual([]);
  });

  it('cancela o agendamento de um item que saiu da lista', () => {
    const first = planExpirySchedule([item('propofol', 20)], [], NOW);
    const second = planExpirySchedule([], [first.toSchedule[0].key], NOW);

    expect(second.toSchedule).toEqual([]);
    expect(second.toCancel).toEqual([first.toSchedule[0].key]);
  });

  // A chave carrega os ids do grupo, então mudar o conteúdo troca a chave e o
  // diff cancela a antiga sozinho — sem lógica extra de comparação.
  it('reagenda quando muda quem vence naquela data', () => {
    const first = planExpirySchedule([item('propofol', 20)], [], NOW);
    const second = planExpirySchedule(
      [item('propofol', 20), item('cetamina', 20)],
      [first.toSchedule[0].key],
      NOW,
    );

    expect(second.toCancel).toEqual([first.toSchedule[0].key]);
    expect(second.toSchedule).toHaveLength(1);
    expect(second.toSchedule[0].items).toHaveLength(2);
  });

  it('reagenda quando a validade é editada', () => {
    const first = planExpirySchedule([item('propofol', 20)], [], NOW);
    const second = planExpirySchedule(
      [item('propofol', 25)],
      [first.toSchedule[0].key],
      NOW,
    );

    expect(second.toCancel).toEqual([first.toSchedule[0].key]);
    expect(second.toSchedule).toHaveLength(1);
  });

  it('reporta data ilegível sem agendar', () => {
    const broken = {
      id: 'quebrado',
      name: 'quebrado',
      expirationDate: '15/09/2026' as IsoDate,
    };

    const plan = planExpirySchedule([item('ok', 20), broken], [], NOW);

    expect(plan.toSchedule).toHaveLength(1);
    expect(plan.invalidItems.map(i => i.id)).toEqual(['quebrado']);
  });

  // O iOS descarta em silêncio o que passa de 64 pendentes.
  it('respeita o teto de agendamentos, priorizando os vencimentos próximos', () => {
    const many = Array.from({ length: MAX_SCHEDULED_DATES + 10 }, (_, i) =>
      item(`item-${i}`, i + 1),
    );

    const plan = planExpirySchedule(many, [], NOW);

    expect(plan.toSchedule).toHaveLength(MAX_SCHEDULED_DATES);

    const dates = plan.toSchedule.map(entry => entry.fireAt.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    expect(plan.toSchedule[0].items[0].id).toBe('item-0');
  });
});

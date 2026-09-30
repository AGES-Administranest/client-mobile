import type { Appointment } from './appointment';
import {
  applyPendingOperations,
  clientGeneratedIdOf,
  enqueueUpdate,
  isLocalAppointmentId,
  isNetworkError,
  localAppointmentId,
  type PendingAppointmentOperation,
} from './offlineAppointments';

const at = (day: number, hour: number) =>
  new Date(2026, 8, day, hour, 0).toISOString();

const CREATE: PendingAppointmentOperation = {
  kind: 'create',
  clientGeneratedId: 'cg-1',
  payload: {
    startsAt: at(30, 15),
    endsAt: at(30, 16),
    status: 'SCHEDULED',
    patientName: 'Thomas',
    species: 'CANINE',
    amount: 200,
  },
};

describe('ids locais', () => {
  it('ida e volta entre clientGeneratedId e id da agenda', () => {
    const id = localAppointmentId('cg-1');
    expect(isLocalAppointmentId(id)).toBe(true);
    expect(clientGeneratedIdOf(id)).toBe('cg-1');
    expect(isLocalAppointmentId('7c2f0a52-0000-4000-8000-000000000000')).toBe(
      false,
    );
  });
});

describe('isNetworkError', () => {
  it.each([
    ['falha de rede do fetch', new TypeError('Network request failed'), true],
    ['erro genérico', new Error('boom'), false],
    ['valor qualquer', 'x', false],
  ])('%s', (_label, error, expected) => {
    expect(isNetworkError(error)).toBe(expected);
  });
});

describe('enqueueUpdate', () => {
  it('edição de um criado offline entra no próprio create', () => {
    const queue = enqueueUpdate([CREATE], localAppointmentId('cg-1'), {
      patientName: 'Oliver',
    });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      kind: 'create',
      payload: { patientName: 'Oliver', amount: 200 },
    });
  });

  it('edição de um agendamento do backend vira uma operação de update', () => {
    const queue = enqueueUpdate([CREATE], 'server-1', { amount: 300 });
    expect(queue).toEqual([
      CREATE,
      { kind: 'update', appointmentId: 'server-1', changes: { amount: 300 } },
    ]);
  });

  it('duas edições do mesmo agendamento se juntam, a mais recente vencendo', () => {
    const once = enqueueUpdate([], 'server-1', { amount: 300, notes: 'a' });
    const twice = enqueueUpdate(once, 'server-1', { amount: 350 });
    expect(twice).toEqual([
      {
        kind: 'update',
        appointmentId: 'server-1',
        changes: { amount: 350, notes: 'a' },
      },
    ]);
  });
});

describe('applyPendingOperations', () => {
  const SERVER: Appointment = {
    id: 'server-1',
    patientName: 'Mel',
    startsAt: at(29, 9),
    status: 'SCHEDULED',
    amount: '100.00',
  };

  it('aplica a edição pendente e marca o card como pendente', () => {
    const [edited] = applyPendingOperations(
      [SERVER],
      [{ kind: 'update', appointmentId: 'server-1', changes: { amount: 150 } }],
      '2026-09',
    );
    expect(edited).toMatchObject({
      id: 'server-1',
      amount: 150,
      pendingSync: true,
    });
  });

  it('soma os criados offline do mês, com id local', () => {
    const list = applyPendingOperations([SERVER], [CREATE], '2026-09');
    expect(list.map(appointment => appointment.id)).toEqual([
      'server-1',
      'local:cg-1',
    ]);
    expect(list[1]).toMatchObject({
      patientName: 'Thomas',
      status: 'SCHEDULED',
      pendingSync: true,
    });
  });

  it('deixa de fora os criados offline de outro mês', () => {
    expect(applyPendingOperations([], [CREATE], '2026-10')).toEqual([]);
  });

  it('sem fila, devolve a agenda como veio', () => {
    expect(applyPendingOperations([SERVER], [], '2026-09')).toEqual([SERVER]);
  });
});

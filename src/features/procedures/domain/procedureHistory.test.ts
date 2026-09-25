import { buildAppointment } from './appointment.fixture';
import {
  buildClientNames,
  resolveClientName,
  toHistoryItems,
} from './procedureHistory';

const names = buildClientNames([
  { id: 'client-1', name: 'Clínica VetCenter' },
  { id: 'client-2', name: 'Hospital Pet Care' },
]);

describe('resolveClientName', () => {
  it('usa o nome do tomador cadastrado', () => {
    expect(resolveClientName(buildAppointment(), names)).toBe(
      'Clínica VetCenter',
    );
  });

  it('prefere o tomador cadastrado ao texto livre antigo', () => {
    expect(
      resolveClientName(
        buildAppointment({ location: 'Clínica Antiga' }),
        names,
      ),
    ).toBe('Clínica VetCenter');
  });

  it('cai no texto livre quando o registro é anterior ao clientId', () => {
    expect(
      resolveClientName(
        buildAppointment({ clientId: null, location: 'Clínica Antiga' }),
        names,
      ),
    ).toBe('Clínica Antiga');
  });

  it('cai no texto livre quando o tomador não está na lista carregada', () => {
    expect(
      resolveClientName(
        buildAppointment({ clientId: 'outro', location: 'Clínica Antiga' }),
        names,
      ),
    ).toBe('Clínica Antiga');
  });

  it.each([[null], [''], ['   ']])(
    'devolve null sem tomador nem local útil (location %j)',
    location => {
      expect(
        resolveClientName(
          buildAppointment({ clientId: null, location }),
          names,
        ),
      ).toBeNull();
    },
  );

  it('devolve null com lista de tomadores ainda vazia e sem local', () => {
    expect(resolveClientName(buildAppointment(), new Map())).toBeNull();
  });
});

describe('toHistoryItems', () => {
  it('mantém a ordem recebida e resolve o nome de cada atendimento', () => {
    const items = toHistoryItems(
      [
        buildAppointment({ id: 'b', clientId: 'client-2' }),
        buildAppointment({ id: 'a', clientId: 'client-1' }),
      ],
      names,
    );

    expect(items.map(item => [item.appointment.id, item.clientName])).toEqual([
      ['b', 'Hospital Pet Care'],
      ['a', 'Clínica VetCenter'],
    ]);
  });

  it('devolve lista vazia para lista vazia', () => {
    expect(toHistoryItems([], names)).toEqual([]);
  });
});

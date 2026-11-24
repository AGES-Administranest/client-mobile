import {
  useAppointmentDetail,
  type AppointmentDetailState,
} from 'features/procedures/hooks/useAppointmentDetail';
import { AppointmentDetailScreen } from 'features/procedures/screens/AppointmentDetailScreen';
import type { AppointmentResult } from 'features/procedures/services/procedureService';
import type { AppointmentTripsState, Trip } from 'features/trips';

import { renderScreen, type Screen } from '../../../support/screen';

const mockAuth = { session: { idToken: 'token' }, account: { id: 'user-1' } };
const mockSelector = {
  submit: jest.fn(),
  reset: jest.fn(),
  canSubmit: true,
  options: [],
};
let mockTrips: AppointmentTripsState;
const mockTripsOptions = jest.fn();

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/procedures/hooks/useAppointmentDetail', () => ({
  useAppointmentDetail: jest.fn(),
}));
jest.mock('features/procedures/components/ProcedureFormSheet', () => ({
  ProcedureFormSheet: (props: object) => {
    const { View } = require('react-native');
    return <View testID="form" {...props} />;
  },
}));
jest.mock('features/stock', () => ({
  SupplySelectorSheet: (props: object) => {
    const { View } = require('react-native');
    return <View testID="selector" {...props} />;
  },
  useSupplySelector: () => mockSelector,
}));
jest.mock('features/trips', () => ({
  ...jest.requireActual('features/trips/components/TripListItem'),
  ...jest.requireActual('features/trips/screens/useTripRowTexts'),
  useAppointmentTrips: (options: object) => {
    mockTripsOptions(options);
    return mockTrips;
  },
}));

const detailMock = jest.mocked(useAppointmentDetail);

const appointment = (overrides: Partial<AppointmentResult> = {}) =>
  ({
    id: 'apt-1',
    clientId: 'client-1',
    procedureName: 'Orquiectomia',
    startsAt: new Date(2026, 9, 16, 13).toISOString(),
    endsAt: new Date(2026, 9, 16, 15).toISOString(),
    location: 'VetSul',
    amount: '500.00',
    patientName: 'Mel',
    ownerName: null,
    species: 'CANINE',
    patientAgeYears: 3,
    weightKg: '10',
    asa: 'II',
    notes: null,
    status: 'COMPLETED',
    ...overrides,
  } as AppointmentResult);

const TRIP: Trip = {
  id: 'trip-1',
  mode: 'OWN_VEHICLE',
  vehicleId: 'veh-1',
  appointmentId: 'apt-1',
  clientId: 'client-1',
  occurredOn: '2026-10-16',
  origin: 'Casa',
  destination: 'VetSul',
  distanceKm: '10',
  cost: '15.00',
};

const noTrips = (): AppointmentTripsState => ({
  trips: [],
  vehicles: [
    { id: 'veh-1', brand: 'Fiat', model: 'Uno', costPerKm: '1.50' } as never,
  ],
  hasNoVehicles: false,
  expanded: false,
  mode: 'OWN_VEHICLE',
  origin: 'Casa',
  destination: 'VetSul',
  selectedVehicleId: '',
  distanceKm: '',
  cost: '',
  previewCost: 0,
  submitting: false,
  error: null,
  tripToDelete: null,
  toggleExpanded: jest.fn(),
  setMode: jest.fn(),
  setOrigin: jest.fn(),
  setDestination: jest.fn(),
  setSelectedVehicleId: jest.fn(),
  setDistanceKm: jest.fn(),
  setCost: jest.fn(),
  confirm: jest.fn().mockResolvedValue(undefined),
  askToDelete: jest.fn(),
  confirmDelete: jest.fn().mockResolvedValue(undefined),
});

let detail: AppointmentDetailState;
const onClose = jest.fn();
const onChanged = jest.fn();

const open = (overrides: Partial<AppointmentDetailState> = {}) => {
  detail = { ...detail, ...overrides };
  detailMock.mockReturnValue(detail);
  return renderScreen(
    <AppointmentDetailScreen
      appointmentId="apt-1"
      onClose={onClose}
      onChanged={onChanged}
    />,
  );
};

const plain = (screen: Screen) => screen.text().replace(/ /g, ' ');
const propsOf = (screen: Screen, testID: string) =>
  screen.root.findAllByProps({ testID })[0].props;

beforeEach(() => {
  jest.clearAllMocks();
  mockTrips = noTrips();
  detail = {
    appointment: appointment(),
    supplies: [],
    status: 'ready',
    pendingSync: false,
    supplyFailed: false,
    savingSupply: false,
    refetch: jest.fn(),
    addSupply: jest.fn().mockResolvedValue(true),
    removeSupply: jest.fn().mockResolvedValue(undefined),
    saveAmount: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(true),
  };
});

describe('what the detail shows', () => {
  it('describes the appointment, its hours and what it earned per hour', async () => {
    const text = plain(await open());

    for (const value of [
      'Mel',
      'Canino',
      'Concluído',
      'Orquiectomia',
      'VetSul',
      '3 anos',
      '10 kg',
      '13:00 – 15:00',
      '2h',
      '120 minutos',
      'R$ 250',
    ]) {
      expect(text).toContain(value);
    }
  });

  it('says what was not informed', async () => {
    const text = plain(
      await open({
        appointment: appointment({
          patientName: null,
          procedureName: null,
          location: null,
          species: null,
          asa: null,
          patientAgeYears: null,
          weightKg: null,
          amount: null,
          endsAt: null,
        }),
      }),
    );

    expect(text).toContain('Sem nome');
    expect(text.match(/Não informado/g)).toHaveLength(3);
    expect(text).toContain('Sem valor');
    expect(text).not.toContain('Horas trabalhadas');
  });

  it('shows why it was canceled and lets nothing be changed', async () => {
    const screen = await open({
      appointment: appointment({ status: 'CANCELED', notes: 'Não compareceu' }),
    });

    expect(screen.has('Cancelado')).toBe(true);
    expect(screen.has('Motivo do cancelamento')).toBe(true);
    expect(screen.has('Não compareceu')).toBe(true);
    for (const action of ['Editar atendimento', 'Adicionar insumo']) {
      expect(
        screen.root.findAll(node => node.props.accessibilityLabel === action),
      ).toHaveLength(0);
    }
  });

  it('can be loaded again after a failure', async () => {
    const screen = await open({ status: 'error', appointment: null });

    expect(screen.has('Não foi possível carregar o atendimento.')).toBe(true);
    await screen.press('Tentar de novo');
    expect(detail.refetch).toHaveBeenCalledTimes(1);
    await screen.press('Voltar');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('waits for the sync to change what lives on the server', async () => {
    const screen = await open({ pendingSync: true });

    expect(
      screen.has('ficam disponíveis depois que o agendamento for enviado'),
    ).toBe(true);
    expect(
      screen.root.findAll(
        node => node.props.accessibilityLabel === 'Adicionar insumo',
      ),
    ).toHaveLength(0);
  });
});

describe('supplies', () => {
  const supplies = [
    { id: 'mov-1', name: 'Dipirona', quantity: 2, unitCost: 5 },
  ];
  const confirm = (screen: Screen) =>
    screen.act(() => propsOf(screen, 'selector').onConfirm());

  it('takes supplies and trips out of the margin', async () => {
    mockTrips.trips = [TRIP];
    const text = plain(await open({ supplies }));

    expect(text).toContain('Dipirona');
    expect(text).toContain('Total insumos');
    expect(text).toContain('Total deslocamento');
    expect(text).toContain('Total de custos');
    // 500 − 10 − 15
    expect(text).toContain('R$ 475');
  });

  it('adds the supply that was chosen', async () => {
    mockSelector.submit.mockReturnValue({ itemId: 'item-1', quantity: 2 });
    const screen = await open();
    await screen.press('Adicionar insumo');
    expect(propsOf(screen, 'selector').visible).toBe(true);

    await confirm(screen);

    expect(detail.addSupply).toHaveBeenCalledWith('item-1', 2);
    expect(propsOf(screen, 'selector').visible).toBe(false);
    expect(mockSelector.reset).toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('stays open until a supply is chosen', async () => {
    mockSelector.submit.mockReturnValue(null);
    const screen = await open();
    await screen.press('Adicionar insumo');

    await confirm(screen);

    expect(detail.addSupply).not.toHaveBeenCalled();
    expect(propsOf(screen, 'selector').visible).toBe(true);
  });

  it('announces no change when the supply was not saved', async () => {
    mockSelector.submit.mockReturnValue({ itemId: 'item-1', quantity: 2 });
    const screen = await open({
      addSupply: jest.fn().mockResolvedValue(false),
      supplyFailed: true,
    });

    await confirm(screen);

    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.has('Não foi possível salvar os insumos.')).toBe(true);
  });

  it('removes a supply', async () => {
    const screen = await open({ supplies });

    await screen.press('Remover Dipirona');

    expect(detail.removeSupply).toHaveBeenCalledWith('mov-1');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('the amount', () => {
  async function openAmount(overrides = {}) {
    const screen = await open(overrides);
    await screen.press('Editar');
    expect(screen.has('Valor do atendimento')).toBe(true);
    return screen;
  }

  it('starts from the current one and saves what was typed', async () => {
    const screen = await openAmount();
    expect(screen.valueOf('0,00')).toBe('500,00');

    await screen.type('0,00', '65050');
    await screen.press('Salvar');

    expect(detail.saveAmount).toHaveBeenCalledWith('650,50');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('explains why it was not saved, until it is edited', async () => {
    const screen = await openAmount({
      saveAmount: jest.fn().mockResolvedValue('FAILED'),
    });

    await screen.press('Salvar');
    expect(screen.has('Não foi possível salvar o valor.')).toBe(true);
    expect(onChanged).not.toHaveBeenCalled();

    await screen.type('0,00', '1');
    expect(screen.has('Não foi possível salvar o valor.')).toBe(false);
  });
});

describe('deleting', () => {
  it('closes when it is gone, and says when it could not be', async () => {
    const remove = jest.fn().mockResolvedValueOnce(false);
    const screen = await open({ remove });
    const confirm = () =>
      screen.act(() =>
        screen.root
          .findAll(
            node =>
              typeof node.props.onConfirm === 'function' &&
              node.props.title === 'Excluir este atendimento?',
          )[0]
          .props.onConfirm(),
      );
    await screen.press('Excluir');

    await confirm();
    expect(screen.has('Não foi possível excluir.')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    remove.mockResolvedValueOnce(true);
    await confirm();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('editing', () => {
  it('opens and closes the form', async () => {
    const screen = await open();
    expect(propsOf(screen, 'form').visible).toBe(false);

    await screen.press('Editar atendimento');
    expect(propsOf(screen, 'form').visible).toBe(true);

    await screen.act(() => propsOf(screen, 'form').onClose());
    expect(propsOf(screen, 'form').visible).toBe(false);
  });
});

describe('trips', () => {
  it('belong to the appointment, its client and its day', async () => {
    await open();

    expect(mockTripsOptions).toHaveBeenCalledWith({
      appointmentId: 'apt-1',
      clientId: 'client-1',
      occurredOn: '2026-10-16',
      defaultOrigin: 'Casa',
      defaultDestination: 'VetSul',
    });
  });

  it('can be registered with a vehicle', async () => {
    mockTrips.expanded = true;
    mockTrips.previewCost = 15;
    const screen = await open();

    await screen.press('Selecione um carro');
    await screen.press('Fiat Uno (R$ 1,50/km)');
    await screen.type('Distância (km)', '10');
    await screen.type('Origem', 'Hotel');
    await screen.type('Destino', 'HospVet');
    await screen.press('Aplicativo / Táxi');
    await screen.press('Veículo próprio');
    await screen.press('Confirmar');

    expect(mockTrips.setSelectedVehicleId).toHaveBeenCalledWith('veh-1');
    expect(mockTrips.setDistanceKm).toHaveBeenCalledWith('10');
    expect(mockTrips.setOrigin).toHaveBeenCalledWith('Hotel');
    expect(mockTrips.setDestination).toHaveBeenCalledWith('HospVet');
    expect(jest.mocked(mockTrips.setMode).mock.calls).toEqual([
      ['RIDE'],
      ['OWN_VEHICLE'],
    ]);
    expect(mockTrips.confirm).toHaveBeenCalledTimes(1);
    expect(plain(screen)).toContain('R$ 15,00');
  });

  it('can be registered with a fare, masked as money', async () => {
    mockTrips = { ...mockTrips, expanded: true, mode: 'RIDE' };
    const screen = await open();

    await screen.type('Valor pago (R$)', '3550');
    await screen.type('Distância (km) (opcional)', '8');

    expect(mockTrips.setCost).toHaveBeenCalledWith('35,50');
    expect(mockTrips.setDistanceKm).toHaveBeenCalledWith('8');
  });

  it.each([
    ['vehicleRequired', 'Selecione um carro'],
    ['saveFailed', 'Não foi possível salvar o deslocamento.'],
  ] as const)('explain %s', async (error, message) => {
    mockTrips = {
      ...mockTrips,
      expanded: true,
      selectedVehicleId: 'veh-1',
      error,
    };

    const screen = await open();

    expect(screen.has(message)).toBe(true);
    expect(plain(screen)).toContain('Fiat Uno (R$ 1,50/km)');
  });

  it('say when there is no vehicle, and while saving', async () => {
    mockTrips = {
      ...mockTrips,
      expanded: true,
      hasNoVehicles: true,
      submitting: true,
    };

    const screen = await open();

    expect(screen.has('Você ainda não possui veículos cadastrados.')).toBe(
      true,
    );
    expect(screen.isDisabled('Salvando...')).toBe(true);
  });

  it('ask before being removed', async () => {
    mockTrips.trips = [TRIP];
    const screen = await open();
    await screen.press('Excluir deslocamento');
    expect(mockTrips.askToDelete).toHaveBeenCalledWith(TRIP);
    screen.unmount();

    mockTrips = { ...mockTrips, tripToDelete: TRIP };
    const asking = await open();
    const sheet = asking.root.findAll(
      node =>
        typeof node.props.onConfirm === 'function' &&
        node.props.title === 'Excluir deslocamento',
    )[0];
    await asking.act(() => sheet.props.onConfirm());
    await asking.act(() => sheet.props.onCancel());

    expect(mockTrips.confirmDelete).toHaveBeenCalledTimes(1);
    expect(mockTrips.askToDelete).toHaveBeenLastCalledWith(null);
  });
});

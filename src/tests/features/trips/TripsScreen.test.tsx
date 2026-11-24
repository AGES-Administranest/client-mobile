import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from 'features/trips/domain/trip.types';
import { TripsScreen } from 'features/trips/screens/TripsScreen';
import { tripService } from 'features/trips/services/tripService';
import { ApiError } from 'shared/services/apiClient';

import { renderScreen } from '../../support/screen';

const mockAuth = { session: { idToken: 'token' }, account: { id: 'user-1' } };
const mockVehicles = [
  { id: 'veh-1', brand: 'Fiat', model: 'Uno', costPerKm: '1.50' },
];
const mockVehiclesState = { vehicles: mockVehicles, isLoading: false };
const mockNames = { 'client-1': 'VetSul' };
const mockSearch = {
  term: '',
  status: 'idle',
  options: [],
  onTermChange: jest.fn(),
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/vehicles', () => ({
  useVehicles: () => mockVehiclesState,
}));
jest.mock('features/clients', () => {
  const { View } = require('react-native');
  return {
    ClientAutocomplete: View,
    useClientNames: () => mockNames,
    useClientSearch: () => mockSearch,
  };
});
jest.mock('features/trips/services/tripService', () => ({
  tripService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const service = jest.mocked(tripService);

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  mode: 'OWN_VEHICLE',
  vehicleId: 'veh-1',
  appointmentId: null,
  clientId: 'client-1',
  occurredOn: '2026-10-10',
  origin: 'Casa',
  destination: 'Clínica VetNova',
  distanceKm: '10.5',
  cost: '15.75',
  ...overrides,
});

const page = (items: Trip[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  totalKm: '10.50',
  totalCost: '15.75',
});

const onClose = jest.fn();
const onTripsChanged = jest.fn();
const open = () =>
  renderScreen(
    <TripsScreen visible onClose={onClose} onTripsChanged={onTripsChanged} />,
  );

/** Intl puts a non-breaking space after the currency. */
const plain = (text: string) => text.replace(/ /g, ' ');

beforeEach(async () => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 20, 12),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
  });
  Object.values(service).forEach(method => method.mockReset());
  service.list.mockResolvedValue(page([trip()]));
  onClose.mockReset();
  onTripsChanged.mockReset();
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());

describe('the trips of a month', () => {
  it('shows the trips and the totals of the current month', async () => {
    const screen = await open();
    const text = plain(screen.text());

    expect(service.list).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ from: '2026-10-01', to: '2026-10-31' }),
    );
    expect(text).toContain('Outubro 2026');
    expect(text).toContain('MÊS ATUAL');
    expect(text).toContain('Fiat Uno · 10,5 km');
    expect(text).toContain('VetSul');
    expect(text).toContain('R$ 15,75');
    expect(text).toContain('10,5 km');
  });

  it('describes a ride, and a vehicle that is gone', async () => {
    service.list.mockResolvedValue(
      page([
        trip({ id: 'a', mode: 'RIDE', vehicleId: null, distanceKm: null }),
        trip({ id: 'b', vehicleId: 'veh-9', clientId: null }),
      ]),
    );

    const screen = await open();

    expect(screen.has('Aplicativo')).toBe(true);
    expect(screen.has('Veículo próprio · 10,5 km')).toBe(true);
  });

  it('moves between months', async () => {
    const screen = await open();

    await screen.press('Mês anterior');
    expect(screen.has('Setembro 2026')).toBe(true);
    expect(screen.has('MÊS ATUAL')).toBe(false);
    expect(service.list).toHaveBeenLastCalledWith(
      'token',
      expect.objectContaining({ from: '2026-09-01', to: '2026-09-30' }),
    );

    await screen.press('Próximo mês');
    expect(screen.has('Outubro 2026')).toBe(true);
  });

  it('invites to register the first one of the month', async () => {
    service.list.mockResolvedValue({
      ...page([]),
      totalKm: '0.00',
      totalCost: '0.00',
    });

    const screen = await open();

    expect(screen.has('Nenhum deslocamento em outubro')).toBe(true);
    await screen.press('Voltar');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('registering a trip', () => {
  async function openForm() {
    const screen = await open();
    await screen.press('Registrar deslocamento');
    expect(screen.has('Novo deslocamento')).toBe(true);
    return screen;
  }

  it('goes through both steps and refreshes the list', async () => {
    service.create.mockResolvedValue(trip({ id: 'trip-2' }));
    const screen = await openForm();

    await screen.type('ORIGEM', 'Casa');
    await screen.type('DESTINO', 'HospVet');
    await screen.press('Próximo');
    expect(screen.has('Passo 2 de 2')).toBe(true);
    expect(screen.has('Selecione um veículo para calcular')).toBe(true);

    await screen.press('Selecione um veículo');
    const option = 'Fiat Uno · R$ 1,50/km';
    await screen.press(option);
    expect(screen.has('Informe a distância para calcular')).toBe(true);

    await screen.type('DISTÂNCIA (KM)', '10');
    expect(plain(screen.text())).toContain('10 km × R$ 1,50/km');
    expect(plain(screen.text())).toContain('R$ 15,00');

    await screen.type('DATA', '05102026');
    expect(screen.valueOf('DATA')).toBe('05/10/2026');
    await screen.press('Salvar');

    expect(service.create).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        occurredOn: '2026-10-05',
        origin: 'Casa',
        destination: 'HospVet',
        vehicleId: 'veh-1',
        distanceKm: 10,
      }),
    );
    expect(onTripsChanged).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('shows what is missing in each step', async () => {
    const screen = await openForm();

    await screen.press('Próximo');
    expect(screen.has('Informe a origem.')).toBe(true);
    expect(screen.has('Informe o destino.')).toBe(true);

    await screen.type('ORIGEM', 'Casa');
    await screen.type('DESTINO', 'HospVet');
    await screen.press('Próximo');
    await screen.type('DATA', '0510');
    await screen.press('Salvar');
    expect(screen.has('Informe a distância')).toBe(true);
    expect(screen.has('Data inválida')).toBe(true);
    expect(screen.isDisabled('Salvar')).toBe(true);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('asks the fare of a ride', async () => {
    service.create.mockRejectedValue(new ApiError('x', null, 400));
    const screen = await openForm();
    await screen.press('Aplicativo/táxi');
    await screen.type('ORIGEM', 'Casa');
    await screen.type('DESTINO', 'HospVet');
    await screen.press('Próximo');
    expect(screen.has('Informe o valor pago')).toBe(true);

    await screen.type('VALOR PAGO (R$)', '3290');
    expect(screen.valueOf('VALOR PAGO (R$)')).toBe('32,90');
    expect(screen.has('Valor informado')).toBe(true);

    await screen.press('Salvar');
    expect(screen.has('Não foi possível salvar o deslocamento.')).toBe(true);
  });

  it('says when there is no vehicle to choose', async () => {
    mockVehiclesState.vehicles = [];
    const screen = await openForm();
    await screen.type('ORIGEM', 'Casa');
    await screen.type('DESTINO', 'HospVet');
    await screen.press('Próximo');

    expect(screen.has('Nenhum veículo cadastrado')).toBe(true);
    mockVehiclesState.vehicles = mockVehicles;
  });
});

describe('changing a trip', () => {
  async function openTrip() {
    const screen = await open();
    const row = screen.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.trip?.id === 'trip-1',
    )[0];
    await screen.act(() => row.props.onPress(row.props.trip));
    expect(screen.has('Editar deslocamento')).toBe(true);
    await screen.press('Próximo');
    return screen;
  }

  it('saves the edit', async () => {
    service.update.mockResolvedValue(trip());
    const screen = await openTrip();
    expect(screen.valueOf('DISTÂNCIA (KM)')).toBe('10,5');

    await screen.type('DISTÂNCIA (KM)', '12');
    await screen.press('Salvar');

    expect(service.update).toHaveBeenCalledWith(
      'token',
      'trip-1',
      expect.objectContaining({ distanceKm: 12 }),
    );
  });

  it('asks before removing', async () => {
    service.remove.mockResolvedValue(trip());
    const screen = await openTrip();

    await screen.press('Excluir');
    expect(screen.has('Excluir este deslocamento?')).toBe(true);
    await screen.press('Cancelar');
    expect(service.remove).not.toHaveBeenCalled();

    await screen.press('Excluir');
    await screen.press('Excluir');

    expect(service.remove).toHaveBeenCalledWith('token', 'trip-1');
    expect(onTripsChanged).toHaveBeenCalledTimes(1);
  });
});

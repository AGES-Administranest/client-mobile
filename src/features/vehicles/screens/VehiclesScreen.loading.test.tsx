import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { VehiclesScreen } from './VehiclesScreen';
import { fetchVehicles } from '../services/vehicleService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('../services/vehicleService', () => ({
  fetchVehicles: jest.fn(),
  createVehicle: jest.fn(),
  updateVehicle: jest.fn(),
  inactivateVehicle: jest.fn(),
  vehicleService: {
    create: jest.fn(),
    update: jest.fn(),
    inactivate: jest.fn(),
  },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <VehiclesScreen visible onClose={jest.fn()} />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  const texts = () =>
    JSON.stringify(
      renderer.root
        .findAllByType('Text' as never)
        .map(node => node.props.children),
    );
  return { renderer, texts };
}

describe('VehiclesScreen loading the list from the API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error with a retry, not the empty state, when the list fails to load', async () => {
    (fetchVehicles as jest.Mock).mockRejectedValueOnce(new Error('500'));
    const { renderer, texts } = await renderScreen();

    expect(fetchVehicles).toHaveBeenCalledWith('tok');
    expect(texts()).toContain('Não foi possível carregar seus veículos.');
    expect(texts()).not.toContain('Nenhum veículo cadastrado');

    (fetchVehicles as jest.Mock).mockResolvedValueOnce([
      {
        id: 'v-1',
        brand: 'Fiat',
        model: 'Strada',
        fuelType: 'FLEX',
        avgConsumptionKmL: '12.5',
        fuelPrice: '5.899',
        costPerKm: '0.4719',
        active: true,
      },
    ]);
    const retry = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes('Tentar novamente'),
    );
    await act(async () => retry.props.onPress());

    expect(fetchVehicles).toHaveBeenCalledTimes(2);
    expect(texts()).toContain('Fiat Strada');
    expect(texts()).toContain('R$ 0,47/km');
  });

  it('shows a loading indicator while the list is on its way', async () => {
    (fetchVehicles as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    const { renderer, texts } = await renderScreen();

    expect(
      renderer.root.findAll(
        node => node.props.accessibilityLabel === 'Carregando...',
      ).length,
    ).toBeGreaterThan(0);
    expect(texts()).not.toContain('Nenhum veículo cadastrado');
  });
});

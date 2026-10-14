import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { VehiclesScreen } from './VehiclesScreen';
import type { Vehicle } from '../domain/vehicle.types';
import { vehicleService } from '../services/vehicleService';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v-1',
    brand: 'Fiat',
    model: 'Strada 2021',
    fuelType: 'FLEX',
    avgConsumptionKmL: '12.5',
    fuelPrice: '5.899',
    costPerKm: '0.4719',
    active: true,
  },
  {
    id: 'v-2',
    brand: 'Honda',
    model: 'CG 160',
    fuelType: 'GASOLINE',
    avgConsumptionKmL: '35.0',
    fuelPrice: '5.899',
    costPerKm: '0.1685',
    active: true,
  },
  {
    id: 'v-3',
    brand: 'Toyota',
    model: 'Corolla',
    fuelType: 'FLEX',
    avgConsumptionKmL: '11.0',
    fuelPrice: '5.899',
    costPerKm: '0.5362',
    active: true,
  },
];

describe('VehiclesScreen', () => {
  it('renders counter reflecting the real total of vehicles', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('3 VEÍCULOS');
    expect(serialized).toContain('Fiat Strada 2021');
    expect(serialized).toContain('Honda CG 160');
    expect(serialized).toContain('Toyota Corolla');
  });

  it('renders singular counter for a single vehicle', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={[MOCK_VEHICLES[0]]}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('1 VEÍCULO');
  });

  it('renders empty state when there are no vehicles', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen visible={true} onClose={jest.fn()} vehicles={[]} />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('0 VEÍCULOS');
    expect(serialized).toContain('Nenhum veículo cadastrado');
  });

  it('calls onClose when clicking the back button', async () => {
    const handleClose = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={handleClose}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const backButton = renderer!.root.find(
      node =>
        node.props.accessibilityLabel === 'Voltar' &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      backButton.props.onPress();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectVehicle when clicking a vehicle card', async () => {
    const handleSelect = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
              onSelectVehicle={handleSelect}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const cardButton = renderer!.root.find(
      node =>
        node.props.accessibilityLabel?.startsWith('Fiat Strada 2021') &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      cardButton.props.onPress();
    });

    expect(handleSelect).toHaveBeenCalledWith(MOCK_VEHICLES[0]);
  });

  it('calls onAddVehicle when clicking the bottom Add Vehicle button', async () => {
    const handleAdd = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
              onAddVehicle={handleAdd}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const addButton = renderer!.root.find(
      node =>
        node.props.accessibilityLabel === 'Adicionar veículo' &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      addButton.props.onPress();
    });

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('opens VehicleFormSheet in view mode when card is clicked without onSelectVehicle', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const cardButton = renderer!.root.find(
      node =>
        node.props.accessibilityLabel?.startsWith('Fiat Strada 2021') &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      cardButton.props.onPress();
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('Editar veículo');
    expect(serialized).not.toContain('Inativar');
  });

  it('opens VehicleFormSheet in create mode when add button is clicked without onAddVehicle', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const addButton = renderer!.root.find(
      node =>
        node.props.accessibilityLabel === 'Adicionar veículo' &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      addButton.props.onPress();
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('Informações');
  });

  it('opens confirmation modal when Inativar is clicked', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const cardButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node =>
        Boolean(node.props.accessibilityLabel?.startsWith('Fiat Strada 2021')),
      );

    await act(async () => {
      cardButton!.props.onPress();
    });

    const editButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => {
        const rendered = JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        );
        return rendered.includes('Editar veículo');
      });

    await act(async () => {
      editButton!.props.onPress();
    });

    const inactivateButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => {
        const rendered = JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        );
        return rendered.includes('Inativar');
      });

    await act(async () => {
      inactivateButton!.props.onPress();
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('Inativar veículo?');
    expect(serialized).toContain(
      'Tem certeza que deseja inativar esse veículo? Os deslocamentos já registrados com ele serão mantidos com o custo original.',
    );
  });

  it('confirms inactivation, closes sheets, and removes the vehicle from the list', async () => {
    const inactivate = jest
      .spyOn(vehicleService, 'inactivate')
      .mockResolvedValue({ ...MOCK_VEHICLES[0], active: false });
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <VehiclesScreen
              visible={true}
              onClose={jest.fn()}
              vehicles={MOCK_VEHICLES}
            />
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    const cardButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node =>
        Boolean(node.props.accessibilityLabel?.startsWith('Fiat Strada 2021')),
      );

    await act(async () => {
      cardButton!.props.onPress();
    });

    const editButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => {
        const rendered = JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        );
        return rendered.includes('Editar veículo');
      });

    await act(async () => {
      editButton!.props.onPress();
    });

    const inactivateButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => {
        const rendered = JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        );
        return rendered.includes('Inativar');
      });

    await act(async () => {
      inactivateButton!.props.onPress();
    });

    const confirmButton = renderer!.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => {
        const rendered = JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        );
        return rendered.includes('Inativar') && node.props.role === 'button';
      });

    await act(async () => {
      await confirmButton!.props.onPress();
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    const serialized = JSON.stringify(texts);
    expect(inactivate).toHaveBeenCalledWith(expect.any(String), 'v-1');
    expect(serialized).toContain('2 VEÍCULOS');
    expect(serialized).not.toContain('Fiat Strada 2021');
    expect(serialized).toContain('Honda CG 160');
    expect(serialized).toContain('Toyota Corolla');
  });
});

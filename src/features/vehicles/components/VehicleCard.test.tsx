import ReactTestRenderer, { act } from 'react-test-renderer';

import { VehicleCard } from './VehicleCard';
import type { Vehicle } from '../domain/vehicle.types';

const MOCK_VEHICLE: Vehicle = {
  id: 'v-1',
  brand: 'Fiat',
  model: 'Strada 2021',
  fuelType: 'FLEX',
  avgConsumptionKmL: '12.5',
  fuelPrice: '5.899',
  costPerKm: '0.4719',
  active: true,
};

describe('VehicleCard', () => {
  it('renders vehicle brand, model, costPerKm and consumption', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleCard vehicle={MOCK_VEHICLE} />,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('Fiat Strada 2021');
    expect(serialized).toContain('R$ 0,47/km');
    expect(serialized).toContain('12,5 km/L');
  });

  it('triggers onPress callback when pressed', () => {
    const handlePress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleCard vehicle={MOCK_VEHICLE} onPress={handlePress} />,
      );
    });

    const pressable = renderer!.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    act(() => {
      pressable.props.onPress();
    });

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('avoids duplicating brand if model already starts with brand name', () => {
    const vehicleWithDuplicate: Vehicle = {
      ...MOCK_VEHICLE,
      brand: 'Honda',
      model: 'Honda CG 160',
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleCard vehicle={vehicleWithDuplicate} />,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

    const serialized = JSON.stringify(texts);
    expect(serialized).toContain('Honda CG 160');
    expect(serialized).not.toContain('Honda Honda CG 160');
  });

  it('renders deactivated badge when vehicle is inactive', () => {
    const inactiveVehicle: Vehicle = {
      ...MOCK_VEHICLE,
      active: false,
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleCard vehicle={inactiveVehicle} deactivatedLabel="Desativado" />,
      );
    });

    const texts = renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);
    expect(JSON.stringify(texts)).toContain('Desativado');
  });
});

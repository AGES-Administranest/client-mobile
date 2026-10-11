import ReactTestRenderer, { act } from 'react-test-renderer';

import type { VehicleFormTexts } from './VehicleFormSheet';
import { VehicleFormSheet } from './VehicleFormSheet';

const MOCK_TEXTS: VehicleFormTexts = {
  title: 'Informações',
  close: 'Fechar',
  labels: {
    brand: 'MARCA',
    model: 'MODELO DO VEÍCULO',
    fuelType: 'TIPO DE COMBUSTÍVEL',
    avgConsumptionKmL: 'CONSUMO MÉDIO (KM/L)',
    fuelPrice: 'PREÇO DO COMBUSTÍVEL (R$/L)',
  },
  placeholders: {
    brand: 'Ex.: Fiat',
    model: 'Ex.: Strada',
    avgConsumptionKmL: '12.5',
    fuelPrice: '5.89',
  },
  fuelTypes: {
    GASOLINE: 'Gasolina',
    ETHANOL: 'Etanol',
    DIESEL: 'Diesel',
    FLEX: 'Flex',
  },
  estimatedCostTitle: 'Custo estimado por km',
  estimatedCostValue: 'R$ 0,47/km',
  buttons: {
    add: 'Adicionar veículo',
    edit: 'Editar veículo',
    confirm: 'Confirmar',
    inactivate: 'Desativar veículo',
    delete: 'Excluir',
  },
  errors: {
    brandRequired: 'A marca é obrigatória',
    submitFailed: 'Erro ao salvar',
  },
};

const BASE_VALUES = {
  brand: 'Fiat',
  model: 'Strada 2021',
  fuelType: 'FLEX' as const,
  avgConsumptionKmL: '12.5',
  fuelPrice: '5.89',
};

describe('VehicleFormSheet', () => {
  it('renders in create mode with add button', () => {
    const onSubmit = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleFormSheet
          visible
          mode="create"
          values={BASE_VALUES}
          texts={MOCK_TEXTS}
          onChangeField={jest.fn()}
          onStartEdit={jest.fn()}
          onSubmit={onSubmit}
          onInactivate={jest.fn()}
          onClose={jest.fn()}
        />,
      );
    });

    const root = renderer.root;
    expect(root.findByProps({ children: 'Informações' })).toBeTruthy();
    expect(root.findByProps({ children: 'Adicionar veículo' })).toBeTruthy();
  });

  it('renders in view mode with edit and inactivate buttons', () => {
    const onStartEdit = jest.fn();
    const onInactivate = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleFormSheet
          visible
          mode="view"
          values={BASE_VALUES}
          costPerKmEstimate={0.47}
          texts={MOCK_TEXTS}
          onChangeField={jest.fn()}
          onStartEdit={onStartEdit}
          onSubmit={jest.fn()}
          onInactivate={onInactivate}
          onClose={jest.fn()}
        />,
      );
    });

    const root = renderer.root;
    expect(root.findByProps({ children: 'Editar veículo' })).toBeTruthy();
    expect(root.findByProps({ children: 'Desativar veículo' })).toBeTruthy();
    expect(root.findByProps({ children: 'R$ 0,47/km' })).toBeTruthy();
  });

  it('renders in edit mode with confirm and delete buttons', () => {
    const onSubmit = jest.fn();
    const onInactivate = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleFormSheet
          visible
          mode="edit"
          values={BASE_VALUES}
          texts={MOCK_TEXTS}
          onChangeField={jest.fn()}
          onStartEdit={jest.fn()}
          onSubmit={onSubmit}
          onInactivate={onInactivate}
          onClose={jest.fn()}
        />,
      );
    });

    const root = renderer.root;
    expect(root.findByProps({ children: 'Confirmar' })).toBeTruthy();
    expect(root.findByProps({ children: 'Excluir' })).toBeTruthy();
  });

  it('displays field errors when provided', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <VehicleFormSheet
          visible
          mode="create"
          values={BASE_VALUES}
          errors={{ brand: 'brandRequired' }}
          texts={MOCK_TEXTS}
          onChangeField={jest.fn()}
          onStartEdit={jest.fn()}
          onSubmit={jest.fn()}
          onInactivate={jest.fn()}
          onClose={jest.fn()}
        />,
      );
    });

    const root = renderer.root;
    expect(
      root.findByProps({ children: 'A marca é obrigatória' }),
    ).toBeTruthy();
  });
});

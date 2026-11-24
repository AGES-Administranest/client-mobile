import type {
  ProcedureEstimate,
  ProcedureSelectedSupply,
} from 'features/pricing/domain/pricing.types';
import type { UseProcedureEstimate } from 'features/pricing/hooks/useProcedureEstimate';
import { ProcedureEstimateScreen } from 'features/pricing/screens/ProcedureEstimateScreen';

import { renderScreen, type Screen } from '../../support/screen';

let mockEstimate: UseProcedureEstimate;
const mockSelector = {
  options: [{ id: 'item-1', price: 12.5 }],
  submit: jest.fn(),
  reset: jest.fn(),
};

jest.mock('features/pricing/hooks/useProcedureEstimate', () => ({
  useProcedureEstimate: () => mockEstimate,
}));
jest.mock('features/pricing/screens/PricingSetupView', () => ({
  PricingSetupView: (props: object) => {
    const { View } = require('react-native');
    return <View testID="setup" {...props} />;
  },
}));
jest.mock('features/clients', () => ({
  ClientAutocomplete: () => null,
  useClientSearch: () => ({
    term: '',
    status: 'idle',
    options: [],
    onTermChange: jest.fn(),
  }),
}));
jest.mock('features/stock', () => ({
  SupplySelectorSheet: (props: object) => {
    const { View } = require('react-native');
    return <View testID="selector" {...props} />;
  },
  useSupplySelector: () => mockSelector,
}));

const SUPPLY: ProcedureSelectedSupply = {
  itemId: 'item-1',
  name: 'Propofol',
  unit: 'AMPOULE',
  quantity: 2,
  unitCost: 12.5,
};
const RESULT = {
  minimumPrice: 131.47,
  breakEvenPrice: 126.28,
  hoursCost: 57.12,
  tripCost: 49.35,
  suppliesCost: 25,
  hourlyRateUsed: 38.08,
  tripEstimateAvailable: true,
  durationMinutes: 90,
} as unknown as ProcedureEstimate;

const onClose = jest.fn();
const open = (overrides: Partial<UseProcedureEstimate> = {}) => {
  mockEstimate = { ...mockEstimate, ...overrides };
  return renderScreen(<ProcedureEstimateScreen visible onClose={onClose} />);
};
const plain = (screen: Screen) => screen.text().replace(/ /g, ' ');
const propsOf = (screen: Screen, testID: string) =>
  screen.root.findAllByProps({ testID })[0].props;

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'],
  });
  jest.clearAllMocks();
  mockEstimate = {
    hours: '1',
    minutes: '30',
    selectedClient: null,
    selectedSupplies: [],
    durationValidation: {
      isValid: true,
      totalMinutes: 90,
      error: null,
    } as never,
    status: 'idle',
    estimate: null,
    canSave: true,
    setHours: jest.fn(),
    setMinutes: jest.fn(),
    selectClient: jest.fn(),
    clearClient: jest.fn(),
    addSupply: jest.fn(),
    updateSupplyQuantity: jest.fn(),
    removeSupply: jest.fn(),
    clearForm: jest.fn(),
    saveSimulation: jest.fn().mockResolvedValue(true),
    retry: jest.fn(),
    reload: jest.fn(),
  };
});
afterEach(() => jest.useRealTimers());

describe('the result', () => {
  it('adds up labor, trip and supplies', async () => {
    const text = plain(await open({ status: 'success', estimate: RESULT }));

    for (const value of [
      'R$ 131,47',
      'R$ 57,12',
      'R$ 49,35',
      'R$ 25',
      'Mão de obra',
    ]) {
      expect(text).toContain(value);
    }
  });

  it.each([
    ['idle', 'Preencha a duração estimada do procedimento'],
    ['loading', 'Calculando sugestão de valor…'],
  ] as const)('says what is missing while %s', async (status, message) => {
    expect((await open({ status })).has(message)).toBe(true);
  });

  it('can be asked for again after a failure', async () => {
    const screen = await open({ status: 'error' });

    await screen.press('Tentar novamente');

    expect(mockEstimate.retry).toHaveBeenCalledTimes(1);
  });
});

describe('without pricing settings', () => {
  it('goes to the settings and comes back with a new estimate', async () => {
    const screen = await open({ status: 'needsPricingSetup' });

    await screen.press('Configurar honorários');
    await screen.act(() => propsOf(screen, 'setup').onSaved());

    expect(mockEstimate.reload).toHaveBeenCalledTimes(1);
    expect(screen.has('Simular valor')).toBe(true);
  });

  it('goes back from the settings without leaving the screen', async () => {
    const screen = await open({ status: 'needsPricingSetup' });
    await screen.press('Configurar honorários');

    await screen.press('Voltar');
    expect(onClose).not.toHaveBeenCalled();
    expect(mockEstimate.reload).not.toHaveBeenCalled();

    await screen.press('Voltar');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('supplies', () => {
  const confirm = (screen: Screen) =>
    screen.act(() => propsOf(screen, 'selector').onConfirm());

  it('adds the one chosen with its price', async () => {
    mockSelector.submit.mockReturnValue({
      itemId: 'item-1',
      name: 'Propofol',
      unit: 'AMPOULE',
      quantity: 2,
    });
    const screen = await open();
    await screen.press('+ Adicionar insumo');
    expect(propsOf(screen, 'selector').visible).toBe(true);

    await confirm(screen);

    expect(mockEstimate.addSupply).toHaveBeenCalledWith(SUPPLY);
    expect(propsOf(screen, 'selector').visible).toBe(false);
  });

  it('stays open until one is chosen', async () => {
    mockSelector.submit.mockReturnValue(null);
    const screen = await open();
    await screen.press('+ Adicionar insumo');

    await confirm(screen);
    expect(mockEstimate.addSupply).not.toHaveBeenCalled();
    expect(propsOf(screen, 'selector').visible).toBe(true);

    await screen.act(() => propsOf(screen, 'selector').onClose());
    expect(propsOf(screen, 'selector').visible).toBe(false);
  });

  it('removes one', async () => {
    const screen = await open({ selectedSupplies: [SUPPLY] });

    await screen.press('Remover insumo');

    expect(mockEstimate.removeSupply).toHaveBeenCalledWith('item-1');
  });

  it.each([
    ['3,5', 3.5],
    ['0', null],
    ['x', null],
  ])('changes the quantity to "%s"', async (typed, expected) => {
    const screen = await open({ selectedSupplies: [SUPPLY] });
    await screen.press('Editar quantidade');
    expect(screen.valueOf('0')).toBe('2');

    await screen.type('0', typed);
    await screen.press('Confirmar');

    if (expected === null) {
      expect(mockEstimate.updateSupplyQuantity).not.toHaveBeenCalled();
    } else {
      expect(mockEstimate.updateSupplyQuantity).toHaveBeenCalledWith(
        'item-1',
        expected,
      );
    }
  });

  it('keeps the quantity when the person gives up', async () => {
    const screen = await open({ selectedSupplies: [SUPPLY] });
    await screen.press('Editar quantidade');

    await screen.press('Cancelar');

    expect(mockEstimate.updateSupplyQuantity).not.toHaveBeenCalled();
  });
});

describe('the client', () => {
  const selectedClient = { id: 'client-1', name: 'VetSul' };

  it('shows the trip it costs and can be cleared', async () => {
    const screen = await open({
      selectedClient,
      status: 'success',
      estimate: RESULT,
    });
    expect(screen.has('VetSul')).toBe(true);
    expect(screen.has('Custo de deslocamento estimado:')).toBe(true);

    await screen.press('Remover tomador');

    expect(mockEstimate.clearClient).toHaveBeenCalledTimes(1);
  });

  it('warns when its trips are not known yet', async () => {
    const screen = await open({
      selectedClient,
      status: 'success',
      estimate: { ...RESULT, tripEstimateAvailable: false },
    });

    expect(screen.has('Deslocamento não incluído')).toBe(true);
  });
});

describe('the simulation', () => {
  it('confirms that it was saved, for a moment', async () => {
    const screen = await open({ status: 'success', estimate: RESULT });

    await screen.press('Salvar simulação');
    expect(screen.has('Simulação salva com sucesso!')).toBe(true);

    await screen.act(() => jest.advanceTimersByTime(3000));
    expect(screen.has('Simulação salva com sucesso!')).toBe(false);
  });

  it('confirms nothing when it was not saved', async () => {
    const screen = await open({
      status: 'success',
      estimate: RESULT,
      saveSimulation: jest.fn().mockResolvedValue(false),
    });

    await screen.press('Salvar simulação');

    expect(screen.has('Simulação salva com sucesso!')).toBe(false);
  });

  it('can be cleared', async () => {
    const screen = await open({ status: 'success', estimate: RESULT });

    await screen.press('Limpar campos');

    expect(mockEstimate.clearForm).toHaveBeenCalledTimes(1);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { InventoryNotificationsScreen } from 'features/inventory/screens/InventoryNotificationsScreen';

import { renderScreen, type Screen } from '../../../support/screen';

const NOW = new Date(2026, 9, 20, 12);
const LOW = {
  id: 'item-1',
  name: 'Propofol',
  unit: 'AMPOULE',
  quantity: 2,
  minimumStock: 5,
};
const EXPIRING = {
  id: 'lot-1',
  itemId: 'item-2',
  name: 'Cetamina',
  expirationDate: '2026-10-22' as const,
};
const onBack = jest.fn();

const open = (
  props: Partial<
    React.ComponentProps<typeof InventoryNotificationsScreen>
  > = {},
) =>
  renderScreen(
    <InventoryNotificationsScreen
      userId="user-1"
      items={[LOW]}
      lots={[EXPIRING]}
      referenceDate={NOW}
      onBack={onBack}
      {...props}
    />,
  );

const dismiss = (screen: Screen, title: string) =>
  screen.act(() =>
    screen.root
      .findAll(
        node =>
          typeof node.props.onDismiss === 'function' &&
          node.props.title === title,
      )[0]
      .props.onDismiss(),
  );

beforeEach(async () => {
  onBack.mockReset();
  await AsyncStorage.clear();
});

describe('InventoryNotificationsScreen', () => {
  it('describes low stock and expiring lots', async () => {
    const screen = await open();

    expect(screen.has('Propofol com estoque baixo')).toBe(true);
    expect(screen.has('2 unidades restantes (mín. 5)')).toBe(true);
    expect(screen.has('Cetamina irá vencer')).toBe(true);
    expect(screen.has('Cetamina vence em 22/10/2026')).toBe(true);
  });

  it('removes the alert that was dismissed', async () => {
    const screen = await open();

    await dismiss(screen, 'Propofol com estoque baixo');

    expect(screen.has('Propofol')).toBe(false);
    expect(screen.has('Cetamina irá vencer')).toBe(true);
  });

  it('says when there is nothing to worry about', async () => {
    const screen = await open({ items: [], lots: [] });

    expect(screen.has('Nenhum alerta no momento.')).toBe(true);
    await screen.press('Voltar');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['loading', 'Carregando estoque...'],
    ['error', 'Não foi possível carregar o estoque.'],
  ] as const)('shows no alert while %s', async (status, message) => {
    const screen = await open({ status });

    expect(screen.has(message)).toBe(true);
    expect(screen.has('Propofol')).toBe(false);
  });
});

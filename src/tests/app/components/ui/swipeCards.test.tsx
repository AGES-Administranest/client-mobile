import {
  PanResponder,
  Text,
  type PanResponderCallbacks,
  type PanResponderGestureState,
} from 'react-native';
import { act } from 'react-test-renderer';

import { EditableInventoryItemCard } from 'app/components/ui/EditableInventoryItemCard';
import { SwipeToDelete } from 'app/components/ui/SwipeToDelete';
import { InventoryNotificationCard } from 'features/inventory/components/InventoryNotificationCard';

import { renderScreen, type Screen } from '../../../support/screen';

let handlers: PanResponderCallbacks;

beforeEach(() => {
  jest.spyOn(PanResponder, 'create').mockImplementation(config => {
    handlers = config;
    return { panHandlers: {} } as never;
  });
});
afterEach(() => jest.restoreAllMocks());

const gesture = (dx: number, { dy = 0, vx = 0 } = {}) =>
  ({ dx, dy, vx } as PanResponderGestureState);
const drag = (dx: number, options = {}) =>
  act(async () => {
    handlers.onPanResponderMove?.({} as never, gesture(dx, options));
  });
const release = (dx: number, options = {}) =>
  act(async () => {
    handlers.onPanResponderRelease?.({} as never, gesture(dx, options));
  });

const offsetOf = (screen: Screen): number => {
  const [{ props }] = screen.root.findAll(
    node => Array.isArray(node.props.style) && node.props.style[1]?.transform,
  );
  const { translateX } = props.style[1].transform[0];
  return typeof translateX === 'number' ? translateX : translateX.__getValue();
};

describe('SwipeToDelete', () => {
  const onDelete = jest.fn();
  const open = () =>
    renderScreen(
      <SwipeToDelete onDelete={onDelete} deleteLabel="Excluir">
        <Text>card</Text>
      </SwipeToDelete>,
    );

  beforeEach(() => onDelete.mockReset());

  it('only takes a gesture that is clearly horizontal', async () => {
    await open();
    const takes = (dx: number, dy: number) =>
      handlers.onMoveShouldSetPanResponder?.({} as never, gesture(dx, { dy }));

    expect(takes(-20, 5)).toBe(true);
    expect(takes(-5, 0)).toBe(false);
    expect(takes(-20, 20)).toBe(false);
    expect(
      handlers.onPanResponderTerminationRequest?.({} as never, gesture(0)),
    ).toBe(false);
  });

  it('follows the finger to the left and never to the right', async () => {
    const screen = await open();

    await drag(-30);
    expect(offsetOf(screen)).toBe(-30);
    await drag(30);
    expect(offsetOf(screen)).toBe(0);
  });

  it.each([
    ['closes after a short swipe', -30, 0, 0],
    ['reveals the action', -100, 0, -88],
    ['closes when flicked back', -100, 1, 0],
  ])('%s', async (_case, dx, vx, resting) => {
    const screen = await open();

    await drag(dx);
    await release(dx, { vx });

    expect(offsetOf(screen)).toBe(resting);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('goes on from where it was left open', async () => {
    const screen = await open();
    await release(-100);

    await drag(-10);

    expect(offsetOf(screen)).toBe(-98);
  });

  it.each([
    ['a long swipe', -200, 0],
    ['a quick flick', -60, -1],
  ])('deletes after %s', async (_case, dx, vx) => {
    await open();

    await release(dx, { vx });

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('closes when another gesture takes over', async () => {
    const screen = await open();
    await release(-100);

    await act(async () =>
      handlers.onPanResponderTerminate?.({} as never, gesture(0)),
    );

    expect(offsetOf(screen)).toBe(0);
  });

  it('can be deleted without swiping', async () => {
    const screen = await open();

    await screen.press('Excluir');

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('InventoryNotificationCard', () => {
  const onDismiss = jest.fn();
  const open = async (dismissable = true) => {
    const screen = await renderScreen(
      <InventoryNotificationCard
        title="Propofol com estoque baixo"
        description="2 unidades restantes"
        elapsed="há 5 min"
        deleteLabel="Apagar"
        onDismiss={dismissable ? onDismiss : undefined}
      />,
    );
    const [card] = screen.root.findAll(node => node.props.onLayout);
    await act(async () =>
      card.props.onLayout({ nativeEvent: { layout: { width: 200 } } }),
    );
    return { screen, card };
  };

  beforeEach(() => onDismiss.mockReset());

  it('reads its three lines as one', async () => {
    const { card } = await open();

    expect(card.props.accessibilityLabel).toBe(
      'Propofol com estoque baixo. 2 unidades restantes. há 5 min',
    );
  });

  it('is dismissed by a swipe past a third of its width', async () => {
    const { screen } = await open();

    await drag(-60);
    await release(-60);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(offsetOf(screen)).toBe(0);

    await drag(-80);
    await release(-80);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not move to the right and goes back when interrupted', async () => {
    const { screen } = await open();

    await drag(50);
    expect(offsetOf(screen)).toBe(0);

    await drag(-50);
    await act(async () =>
      handlers.onPanResponderTerminate?.({} as never, gesture(0)),
    );
    expect(offsetOf(screen)).toBe(0);
  });

  it('offers the same action to screen readers', async () => {
    const { card } = await open();
    const perform = (actionName: string) =>
      act(async () =>
        card.props.onAccessibilityAction({ nativeEvent: { actionName } }),
      );

    expect(card.props.accessibilityActions).toEqual([
      { name: 'dismiss', label: 'Apagar' },
    ]);
    await perform('activate');
    expect(onDismiss).not.toHaveBeenCalled();
    await perform('dismiss');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('cannot be swiped when there is nothing to dismiss', async () => {
    const { card } = await open(false);
    const takes = () =>
      handlers.onMoveShouldSetPanResponder?.({} as never, gesture(-50));

    expect(takes()).toBe(false);
    expect(card.props.accessibilityActions).toBeUndefined();
  });

  it('leaves the vertical scroll to the list', async () => {
    await open();
    const takes = (dx: number, dy: number) =>
      handlers.onMoveShouldSetPanResponder?.({} as never, gesture(dx, { dy }));

    expect(takes(-50, 10)).toBe(true);
    expect(takes(-50, 60)).toBe(false);
    expect(takes(-5, 0)).toBe(false);
  });
});

describe('EditableInventoryItemCard', () => {
  const onChangeName = jest.fn();
  const onChangeQuantity = jest.fn();
  const card = (
    props: { quantity?: number; warning?: string; subtitle?: string } = {},
  ) => (
    <EditableInventoryItemCard
      name="Propofol"
      quantity={3}
      namePlaceholder="Nome"
      onChangeName={onChangeName}
      onChangeQuantity={onChangeQuantity}
      {...props}
    />
  );
  const fields = (screen: Screen) =>
    screen.root.findAllByType('TextInput' as never);

  beforeEach(() => {
    onChangeName.mockReset();
    onChangeQuantity.mockReset();
  });

  it('keeps only the digits of the quantity', async () => {
    const screen = await renderScreen(card());
    const type = (text: string) =>
      screen.act(() => fields(screen)[1].props.onChangeText(text));

    await type('1a2');
    expect(onChangeQuantity).toHaveBeenLastCalledWith(12);
    expect(fields(screen)[1].props.value).toBe('12');

    await type('');
    expect(onChangeQuantity).toHaveBeenLastCalledWith(0);
    expect(fields(screen)[1].props.value).toBe('');
  });

  it('follows a quantity changed elsewhere, not its own typing', async () => {
    const screen = await renderScreen(card());
    await screen.act(() => fields(screen)[1].props.onChangeText(''));

    await screen.update(card({ quantity: 0 }));
    expect(fields(screen)[1].props.value).toBe('');

    await screen.update(card({ quantity: 7 }));
    expect(fields(screen)[1].props.value).toBe('7');
  });

  it('grows with a long name', async () => {
    const screen = await renderScreen(card());
    const [name] = fields(screen);
    await screen.act(() => name.props.onChangeText('Propofol 1%'));
    expect(onChangeName).toHaveBeenCalledWith('Propofol 1%');

    await screen.act(() =>
      name.props.onContentSizeChange({
        nativeEvent: { contentSize: { height: 48 } },
      }),
    );
    expect(JSON.stringify(fields(screen)[0].props.style)).toContain(
      '"height":48',
    );
  });

  it('shows the subtitle and the warning it is given', async () => {
    const screen = await renderScreen(
      card({ subtitle: '20 mL', warning: 'Confira a quantidade' }),
    );

    expect(screen.has('20 mL')).toBe(true);
    expect(screen.has('Confira a quantidade')).toBe(true);
  });
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import { useSheetAnimation } from './useSheetAnimation';

type Gesture = { dx: number; dy: number; vy: number; y0?: number };
type Handlers = {
  onMoveShouldSetPanResponder: (e: unknown, g: Gesture) => boolean;
  onMoveShouldSetPanResponderCapture: (e: unknown, g: Gesture) => boolean;
  onPanResponderMove: (e: unknown, g: Gesture) => void;
  onPanResponderRelease: (e: unknown, g: Gesture) => void;
};

// Captura a config que o hook entrega ao PanResponder, para simular o gesto
// sem depender do sistema de toque.
let handlers: Handlers;
jest
  .spyOn(require('react-native').PanResponder, 'create')
  .mockImplementation((config: unknown) => {
    handlers = config as Handlers;
    return { panHandlers: {} };
  });

async function mount(visible: boolean, onClose = jest.fn()) {
  const result = {
    current: null as unknown as ReturnType<typeof useSheetAnimation>,
  };
  function Harness({ open }: { open: boolean }) {
    result.current = useSheetAnimation(open, onClose);
    return null;
  }
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness open={visible} />);
  });
  const setVisible = async (open: boolean) =>
    act(async () => renderer.update(<Harness open={open} />));
  return { result, setVisible, onClose };
}

const dragOffset = (result: {
  current: ReturnType<typeof useSheetAnimation>;
}) =>
  (
    result.current.sheetStyle.transform[1].translateY as unknown as {
      __getValue: () => number;
    }
  ).__getValue();

test('fica montado enquanto desce e só desmonta no fim da saída', async () => {
  const { result, setVisible } = await mount(true);
  expect(result.current.isRendered).toBe(true);

  await setVisible(false);

  expect(result.current.isRendered).toBe(false);
});

test.each([
  ['para baixo, no topo', { dx: 0, dy: 20, vy: 0, y0: 520 }, true],
  ['para cima', { dx: 0, dy: -20, vy: 0, y0: 520 }, false],
  ['mais horizontal', { dx: 40, dy: 20, vy: 0, y0: 520 }, false],
  ['para baixo, no meio do conteúdo', { dx: 0, dy: 20, vy: 0, y0: 700 }, false],
] as const)('gesto %s -> assume: %s', async (_label, gesture, expected) => {
  const { result } = await mount(true);
  act(() =>
    result.current.panHandlers.onLayout({
      nativeEvent: { layout: { x: 0, y: 500, width: 375, height: 312 } },
    } as never),
  );

  expect(handlers.onMoveShouldSetPanResponder(null, gesture)).toBe(expected);
  expect(handlers.onMoveShouldSetPanResponderCapture(null, gesture)).toBe(
    expected,
  );
});

test('acompanha o dedo, mas nunca acima do lugar', async () => {
  const { result } = await mount(true);

  act(() => handlers.onPanResponderMove(null, { dx: 0, dy: 60, vy: 0 }));
  expect(dragOffset(result)).toBe(60);

  act(() => handlers.onPanResponderMove(null, { dx: 0, dy: -30, vy: 0 }));
  expect(dragOffset(result)).toBe(0);
});

test.each([
  ['arrasto longo', { dx: 0, dy: 160, vy: 0.2 }],
  ['puxão rápido', { dx: 0, dy: 40, vy: 1.5 }],
])('%s fecha a folha', async (_label, gesture) => {
  const { onClose } = await mount(true);

  act(() => handlers.onPanResponderRelease(null, gesture));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('um arrasto curto volta a folha para o lugar sem fechar', async () => {
  const { result, onClose } = await mount(true);

  act(() => handlers.onPanResponderMove(null, { dx: 0, dy: 50, vy: 0 }));
  act(() => handlers.onPanResponderRelease(null, { dx: 0, dy: 50, vy: 0.1 }));

  expect(onClose).not.toHaveBeenCalled();
  expect(dragOffset(result)).toBe(0);
});

import { act, type ReactTestRenderer } from 'react-test-renderer';

const mounted = new Set<ReactTestRenderer>();

/**
 * A tree left mounted keeps its listeners and timers, and answers to what the
 * next test does.
 */
afterEach(() => {
  mounted.forEach(renderer => act(() => renderer.unmount()));
  mounted.clear();
});

/** Returns what unmounts it earlier. */
export function unmountAfterEach(renderer: ReactTestRenderer): () => void {
  mounted.add(renderer);
  return () => {
    mounted.delete(renderer);
    act(() => renderer.unmount());
  };
}

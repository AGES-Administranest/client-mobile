import ReactTestRenderer, { act } from 'react-test-renderer';

import { unmountAfterEach } from './unmountAfterEach';

export type RenderedHook<Result, Props> = {
  readonly current: Result;
  rerender: (props: Props) => Promise<void>;
  unmount: () => void;
};

/** Mounts a hook in an empty component and lets its effects settle. */
export async function renderHook<Result, Props = undefined>(
  useHook: (props: Props) => Result,
  initialProps?: Props,
): Promise<RenderedHook<Result, Props>> {
  const latest = {} as { result: Result };

  function Harness({ hookProps }: { hookProps: Props }) {
    latest.result = useHook(hookProps);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness hookProps={initialProps as Props} />,
    );
  });

  const unmount = unmountAfterEach(renderer);

  return {
    get current() {
      return latest.result;
    },
    rerender: async props => {
      await act(async () => {
        renderer.update(<Harness hookProps={props} />);
      });
    },
    unmount,
  };
}

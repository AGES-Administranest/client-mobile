import { Eye } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { NoticeBanner } from 'app/components/ui/notice-banner';

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

function actionOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  )[0];
}

describe('NoticeBanner action', () => {
  it('shows the message with no action by default', () => {
    const renderer = render(<NoticeBanner tone="info" message="Aviso" />);

    expect(actionOf(renderer)).toBeUndefined();
  });

  it('puts the action under the notice, as a wide button, unless told otherwise', () => {
    const onAction = jest.fn();
    const renderer = render(
      <NoticeBanner
        tone="warning"
        message="Aviso"
        actionLabel="Fazer"
        onAction={onAction}
      />,
    );

    const action = actionOf(renderer);
    act(() => action.props.onPress());

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(action.props.className).toContain('py-2.5');
    const box = renderer.root.find(node =>
      String(node.props.className).includes('rounded-lg p-3'),
    );
    expect(box.findAll(node => node === action)).toHaveLength(0);
  });

  it('puts an inline action inside the notice, as a small pill', () => {
    const onAction = jest.fn();
    const renderer = render(
      <NoticeBanner
        tone="alert"
        message="Aviso"
        actionLabel="Ver nota"
        actionIcon={Eye}
        actionPlacement="inline"
        onAction={onAction}
      />,
    );

    const action = actionOf(renderer);
    act(() => action.props.onPress());

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(action.props.className).toContain('rounded-full');
    expect(action.props.className).not.toContain('py-2.5');
    const box = renderer.root.find(node =>
      String(node.props.className).includes('rounded-lg p-3'),
    );
    expect(box.findAll(node => node === action)).toHaveLength(1);
  });

  it('shows no inline action without a handler', () => {
    const renderer = render(
      <NoticeBanner
        tone="alert"
        message="Aviso"
        actionLabel="Ver nota"
        actionPlacement="inline"
      />,
    );

    expect(actionOf(renderer)).toBeUndefined();
  });
});

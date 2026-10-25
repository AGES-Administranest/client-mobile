import ReactTestRenderer, { act } from 'react-test-renderer';

import { InvoiceListFooter } from './InvoiceListFooter';

function renderFooter(
  state: { isLoadingMore: boolean; loadMoreFailed: boolean },
  onRetry = jest.fn(),
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <InvoiceListFooter
        {...state}
        loadingLabel="Carregando mais notas"
        errorLabel="Não foi possível carregar mais notas."
        retryLabel="Tentar novamente"
        onRetry={onRetry}
      />,
    );
  });

  return renderer;
}

describe('InvoiceListFooter', () => {
  it('renders nothing while there is nothing to report', () => {
    const renderer = renderFooter({
      isLoadingMore: false,
      loadMoreFailed: false,
    });

    expect(renderer.toJSON()).toBeNull();
  });

  it('shows a labelled spinner while the next page loads', () => {
    const renderer = renderFooter({
      isLoadingMore: true,
      loadMoreFailed: false,
    });

    expect(
      renderer.root.find(
        node => node.props.accessibilityLabel === 'Carregando mais notas',
      ),
    ).toBeTruthy();
  });

  it('offers a retry when loading more failed', () => {
    const onRetry = jest.fn();
    const renderer = renderFooter(
      { isLoadingMore: false, loadMoreFailed: true },
      onRetry,
    );
    const retry = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    act(() => retry.props.onPress());

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

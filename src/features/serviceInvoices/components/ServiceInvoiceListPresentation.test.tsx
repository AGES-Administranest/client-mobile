import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  ServiceInvoiceListPresentation,
  type ServiceInvoiceListRow,
} from './ServiceInvoiceListPresentation';

const TEXTS = {
  title: 'Notas fiscais',
  back: 'Voltar',
  searchPlaceholder: 'Buscar por tomador ou data',
  filters: {
    ALL: 'Todas',
    SYNCED: 'Sincronizadas',
    PENDING: 'Não sincronizadas',
    ERROR: 'Com erro',
  },
  loading: 'Carregando',
  loadFailed: 'Não foi possível carregar.',
  retry: 'Tentar novamente',
  offline: 'Sem conexão: mostrando as notas salvas.',
  emptyTitle: 'Nenhuma nota fiscal',
  emptyMessage: 'Registre uma nota.',
  noResultsTitle: 'Nada encontrado',
  noResultsMessage: 'Tente outro tomador.',
  add: 'Adicionar nota',
};

const ROW: ServiceInvoiceListRow = {
  id: 'n1',
  title: 'Nota Fiscal 000458',
  issueDate: '22/04/2026',
  clientLine: 'Tomador: HospVet Sul',
  location: 'São Paulo, SP',
  amount: 'R$ 1.284,50',
  status: 'SYNCED',
  statusLabel: 'Sincronizado',
  fileAvailableLabel: 'PDF original disponível',
  onPress: jest.fn(),
};

function render(
  props: Partial<
    React.ComponentProps<typeof ServiceInvoiceListPresentation>
  > = {},
) {
  const handlers = {
    onChangeTerm: jest.fn(),
    onChangeFilter: jest.fn(),
    onLoadMore: jest.fn(),
    onRetry: jest.fn(),
    onBack: jest.fn(),
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ServiceInvoiceListPresentation
        texts={TEXTS}
        status="ready"
        isOffline={false}
        rows={[ROW]}
        term=""
        filter="ALL"
        isFiltering={false}
        isLoadingMore={false}
        hasMore={false}
        {...handlers}
        {...props}
      />,
    );
  });
  return { renderer, ...handlers };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => node.children.join(''));
}

describe('ServiceInvoiceListPresentation', () => {
  it('lists each note with date, taker, amount and status', () => {
    const { renderer } = render();

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Nota Fiscal 000458',
        '22/04/2026',
        'Tomador: HospVet Sul',
        'R$ 1.284,50',
        'Sincronizado',
      ]),
    );
  });

  it('reports what is typed in the search and the chosen filter', () => {
    const { renderer, onChangeTerm, onChangeFilter } = render();

    act(() =>
      renderer.root.findByType(TextInput).props.onChangeText('hospvet'),
    );
    const chip = renderer.root.findAll(
      node => node.props.accessibilityState?.selected === false,
    )[0]!;
    act(() => chip.props.onPress());

    expect(onChangeTerm).toHaveBeenCalledWith('hospvet');
    expect(onChangeFilter).toHaveBeenCalledWith('SYNCED');
  });

  it('opens the note that was pressed', () => {
    const onPress = jest.fn();
    const { renderer } = render({ rows: [{ ...ROW, onPress }] });

    const row = renderer.root.findAll(
      node => node.props.onPress === onPress,
    )[0]!;
    act(() => row.props.onPress());

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('guides the person to register a note when there are none', () => {
    const { renderer } = render({ rows: [] });

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining(['Nenhuma nota fiscal', 'Registre uma nota.']),
    );
  });

  it('says nothing matched, rather than showing a blank list, when filtering', () => {
    const { renderer } = render({ rows: [], isFiltering: true, term: 'xyz' });

    const texts = textsOf(renderer);
    expect(texts).toContain('Nada encontrado');
    expect(texts).not.toContain('Nenhuma nota fiscal');
  });

  it('warns that the notes come from the device when offline', () => {
    const { renderer } = render({ isOffline: true });

    expect(textsOf(renderer)).toContain(TEXTS.offline);
  });

  it('offers a retry when the list could not be loaded', () => {
    const { renderer, onRetry } = render({ status: 'error', rows: [] });

    expect(textsOf(renderer)).toContain(TEXTS.loadFailed);
    const retry = renderer.root.findAll(
      node => node.props.onPress === onRetry,
    )[0]!;
    act(() => retry.props.onPress());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the add button in every state and calls it when pressed', () => {
    const onAddInvoice = jest.fn();
    const { renderer } = render({ onAddInvoice, rows: [] });

    expect(textsOf(renderer)).toContain('Adicionar nota');
    const add = renderer.root.findAll(
      node => node.props.onPress === onAddInvoice,
    )[0];
    act(() => add.props.onPress());

    expect(onAddInvoice).toHaveBeenCalledTimes(1);
  });

  it('shows no add button when nothing can add a note', () => {
    const { renderer } = render();

    expect(textsOf(renderer)).not.toContain('Adicionar nota');
  });

  it('keeps the add button below the list when it can add', () => {
    const onAddInvoice = jest.fn();
    const { renderer } = render({ onAddInvoice });

    expect(textsOf(renderer)).toContain('Adicionar nota');
    const add = renderer.root.findAll(
      node => node.props.onPress === onAddInvoice,
    )[0];
    act(() => add.props.onPress());
    expect(onAddInvoice).toHaveBeenCalledTimes(1);
  });

  it('keeps the add button even when there are no notes', () => {
    const { renderer } = render({ rows: [], onAddInvoice: jest.fn() });

    expect(textsOf(renderer)).toContain('Adicionar nota');
  });

  it('has no add button when it cannot add', () => {
    const { renderer } = render();

    expect(textsOf(renderer)).not.toContain('Adicionar nota');
  });
});

import ReactTestRenderer, { act } from 'react-test-renderer';

import { SupplySelectorSheet } from './SupplySelectorSheet';
import {
  formatSupplyPrice,
  type SupplyOption,
} from '../domain/supplySelection';

const PROPOFOL: SupplyOption = {
  id: 'item-1',
  name: 'Propofol 10mg/ml 20ml',
  unit: 'ampola',
  price: 19.9,
  balance: 3,
};

const INSUFFICIENT =
  'Quantidade acima do saldo disponível. O estoque ficará negativo após este registro.';

type Overrides = {
  selected?: SupplyOption | null;
  quantity?: string;
  isOverBalance?: boolean;
  canSubmit?: boolean;
  onConfirm?: () => void;
};

let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

async function render({
  selected = PROPOFOL,
  quantity = '1',
  isOverBalance = false,
  canSubmit = true,
  onConfirm = jest.fn(),
}: Overrides = {}) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SupplySelectorSheet
        visible
        onClose={jest.fn()}
        onConfirm={onConfirm}
        term="propofol"
        onTermChange={jest.fn()}
        options={[PROPOFOL]}
        isLoading={false}
        hasError={false}
        isTermTooShort={false}
        selected={selected}
        onSelect={jest.fn()}
        quantity={quantity}
        onQuantityChange={jest.fn()}
        isOverBalance={isOverBalance}
        canSubmit={canSubmit}
        title="Adicionar insumo"
        materialLabel="MATERIAL"
        searchPlaceholder="Busque pelo nome do item"
        quantityLabel="QUANTIDADE"
        confirmLabel="Confirmar"
        closeLabel="Fechar"
        emptyMessage="Nenhum item encontrado."
        errorMessage="Não foi possível buscar os itens."
        loadingMessage="Buscando..."
        termTooShortMessage="Digite ao menos 2 caracteres."
        insufficientStockMessage={INSUFFICIENT}
        formatPrice={option => formatSupplyPrice(option.price)}
      />,
    );
  });

  return renderer!;
}

function texts(sheet: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    sheet.root.findAllByType('Text' as never).map(node => node.props.children),
  );
}

/** The quantity field is the numeric input, told apart by its "0" placeholder. */
function quantityField(sheet: ReactTestRenderer.ReactTestRenderer) {
  return sheet.root.find(
    node =>
      typeof node.type === 'string' &&
      typeof node.props.onChangeText === 'function' &&
      node.props.placeholder === '0',
  );
}

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
  renderer = undefined;
});

it('stays quiet while the quantity fits the balance', async () => {
  const sheet = await render({ quantity: '3', isOverBalance: false });

  expect(texts(sheet)).not.toContain('Quantidade acima do saldo');
  expect(quantityField(sheet).props.className).toContain(
    'border-details-primary',
  );
});

it('warns under the field once the quantity passes the balance', async () => {
  const sheet = await render({ quantity: '5', isOverBalance: true });

  expect(texts(sheet)).toContain('Quantidade acima do saldo');
});

it('paints the quantity field with the error colour, not the money-negative one', async () => {
  const sheet = await render({ quantity: '5', isOverBalance: true });

  const className = quantityField(sheet).props.className;
  expect(className).toContain('border-destructive');
  // `alert-primary` is reserved for negative monetary values (DESIGN.md).
  expect(className).not.toContain('alert-primary');
});

it('leaves confirm working while over the balance, since stock may go negative', async () => {
  const onConfirm = jest.fn();
  const sheet = await render({
    quantity: '5',
    isOverBalance: true,
    canSubmit: true,
    onConfirm,
  });

  const confirm = sheet.root
    .findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes('Confirmar'),
    )
    .at(-1)!;

  expect(confirm.props.accessibilityState.disabled).toBe(false);

  await act(async () => {
    confirm.props.onPress();
  });

  expect(onConfirm).toHaveBeenCalledTimes(1);
});

it('has nothing to compare against before an item is chosen', async () => {
  const sheet = await render({
    selected: null,
    quantity: '999',
    isOverBalance: true,
  });

  expect(texts(sheet)).not.toContain('Quantidade acima do saldo');
});

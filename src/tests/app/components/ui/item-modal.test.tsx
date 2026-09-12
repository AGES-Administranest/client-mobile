import ReactTestRenderer, { act } from 'react-test-renderer';

import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import { ItemModal } from 'app/components/ui/item-modal/item-modal';
import { I18nProvider } from 'shared/i18n';

const ITEM: StockItem = {
  id: 'item-1',
  name: 'Dipirona 500mg',
  category: 'MEDICATION',
  unitCost: 12.5,
  unit: 'ampola',
  quantity: 25,
  minQuantity: 10,
  expiration: null,
};

const CATEGORY_OPTIONS = [
  { value: 'MEDICATION', label: 'Medicamento' },
  { value: 'DISPOSABLE', label: 'Descartável' },
];

const UNIT_OPTIONS = ['un', 'ampola', 'caixa'];

// A tela mantem o modal montado e so troca `visible`/`item`; montar com
// item=null e depois passar o item reproduz esse ciclo.
async function mountThenOpen(
  props: Partial<React.ComponentProps<typeof ItemModal>>,
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  const base = {
    onClose: () => {},
    categoryOptions: CATEGORY_OPTIONS,
    unitOptions: UNIT_OPTIONS,
  };

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <ItemModal {...base} {...props} visible={false} item={null} />
      </I18nProvider>,
    );
  });

  await act(async () => {
    renderer.update(
      <I18nProvider>
        <ItemModal {...base} {...props} visible item={ITEM} />
      </I18nProvider>,
    );
  });

  return renderer!;
}

function inputValues(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => typeof node.props.onChangeText === 'function')
    .map(node => String(node.props.value ?? ''));
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

test('detail modal shows the item values', async () => {
  const renderer = await mountThenOpen({ mode: 'detail' });

  const values = inputValues(renderer);
  expect(values).toContain('Dipirona 500mg');
  expect(values.join(' ')).toContain('12.5');
  expect(values).toContain('25');
});

test('detail modal shows the minimum stock', async () => {
  const renderer = await mountThenOpen({ mode: 'detail' });

  expect(texts(renderer)).toContain('QUANTIDADE MÍNIMA NO ESTOQUE');
  expect(inputValues(renderer)).toContain('10');
});

test('edit modal keeps the minimum stock field', async () => {
  const renderer = await mountThenOpen({ mode: 'create' });

  expect(texts(renderer)).toContain('QUANTIDADE MÍNIMA NO ESTOQUE');
  expect(inputValues(renderer)).toContain('10');
});

test('edit modal submits the minimum stock it shows', async () => {
  const drafts: unknown[] = [];
  const renderer = await mountThenOpen({
    mode: 'create',
    onConfirm: draft => drafts.push(draft),
  });

  const confirm = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .pop()!;

  await act(async () => {
    confirm.props.onPress();
  });

  expect(drafts[0]).toMatchObject({
    editingItemId: 'item-1',
    minQuantity: '10',
  });
});

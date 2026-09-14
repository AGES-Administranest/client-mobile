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

const IN_STOCK: StockItem[] = [
  { ...ITEM, id: 'a', name: 'Dipirona 500mg', expiration: '2027-03-31' },
  { ...ITEM, id: 'b', name: 'Dipirona 1g', expiration: null },
  { ...ITEM, id: 'c', name: 'Soro fisiológico', expiration: null },
];

async function openCreate(items: StockItem[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <ItemModal
          visible
          onClose={() => {}}
          items={items}
          categoryOptions={CATEGORY_OPTIONS}
          unitOptions={UNIT_OPTIONS}
        />
      </I18nProvider>,
    );
  });
  return renderer!;
}

test('search lists only the items matching what was typed', async () => {
  const renderer = await openCreate(IN_STOCK);

  await act(async () => {
    renderer.root
      .findAll(n => typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('dipi');
  });

  const shown = texts(renderer);
  expect(shown).toContain('Dipirona 500mg');
  expect(shown).toContain('Dipirona 1g');
  expect(shown).not.toContain('Soro fisiológico');
});

test('search shows the expiration date next to the name when there is one', async () => {
  const renderer = await openCreate(IN_STOCK);

  await act(async () => {
    renderer.root
      .findAll(n => typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('dipirona 500');
  });

  expect(texts(renderer)).toContain('31/03/2027');
});

test('search is accent and case insensitive', async () => {
  const renderer = await openCreate(IN_STOCK);

  await act(async () => {
    renderer.root
      .findAll(n => typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('SORO FISIOLOGICO');
  });

  expect(texts(renderer)).toContain('Soro fisiológico');
});

test('picking an item that already exists hides the expiration, keeps quantity', async () => {
  const renderer = await openCreate(IN_STOCK);

  await act(async () => {
    renderer.root
      .findAll(n => typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('dipirona 500');
  });

  // Seleciona o item existente no dropdown
  const match = renderer.root
    .findAll(n => typeof n.props?.onPress === 'function')
    .filter(n =>
      JSON.stringify(
        n.findAllByType('Text' as never).map(t => t.props.children),
      ).includes('Dipirona 500mg'),
    )
    .pop()!;
  await act(async () => {
    match.props.onPress();
  });

  const shown = texts(renderer);
  expect(shown).toContain('QUANTIDADE');
  expect(shown).not.toContain('VALIDADE');
});

test('a brand new item still asks for the expiration', async () => {
  const renderer = await openCreate(IN_STOCK);

  await act(async () => {
    renderer.root
      .findAll(n => typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('Novo item inexistente');
  });
  const addOption = renderer.root
    .findAll(n => typeof n.props?.onPress === 'function')
    .filter(n =>
      JSON.stringify(
        n.findAllByType('Text' as never).map(t => t.props.children),
      ).includes('+ Adicionar'),
    )
    .pop()!;
  await act(async () => {
    addOption.props.onPress();
  });

  expect(texts(renderer)).toContain('VALIDADE');
});

describe('expiration coming from the API', () => {
  const WITH_EXPIRATION: StockItem = { ...ITEM, expiration: '2027-03-31' };

  async function openWith(mode: 'detail' | 'create') {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const base = {
      onClose: () => {},
      categoryOptions: CATEGORY_OPTIONS,
      unitOptions: UNIT_OPTIONS,
    };
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <I18nProvider>
          <ItemModal {...base} mode={mode} visible={false} item={null} />
        </I18nProvider>,
      );
    });
    await act(async () => {
      renderer.update(
        <I18nProvider>
          <ItemModal {...base} mode={mode} visible item={WITH_EXPIRATION} />
        </I18nProvider>,
      );
    });
    return renderer!;
  }

  test('shows it as DD/MM/YYYY, not the raw ISO', async () => {
    const renderer = await openWith('detail');

    const values = inputValues(renderer);
    expect(values).toContain('31/03/2027');
    expect(values).not.toContain('2027-03-31');
  });

  test('a future expiration is not flagged as past', async () => {
    const renderer = await openWith('create');

    expect(texts(renderer)).not.toContain('não pode ser uma data passada');
  });

  test('the confirm button stays enabled for a future expiration', async () => {
    const renderer = await openWith('create');

    const confirm = renderer.root
      .findAll(node => typeof node.props?.onPress === 'function')
      .filter(node =>
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes('Confirmar'),
      )
      .pop();

    expect(confirm?.props.disabled).toBeFalsy();
  });
});

test('a past expiration typed by hand still blocks the submit', async () => {
  const drafts: unknown[] = [];
  const renderer = await mountThenOpen({
    mode: 'create',
    onConfirm: draft => drafts.push(draft),
  });

  const expirationField = renderer.root
    .findAll(node => typeof node.props?.onChangeText === 'function')
    .filter((_, index) => index % 2 === 0);

  await act(async () => {
    expirationField[expirationField.length - 1].props.onChangeText('01012020');
  });

  expect(texts(renderer)).toContain('não pode ser uma data passada');

  const confirm = renderer.root
    .findAll(node => typeof node.props?.onPress === 'function')
    .filter(node =>
      JSON.stringify(
        node.findAllByType('Text' as never).map(t => t.props.children),
      ).includes('Confirmar'),
    )
    .pop()!;

  expect(confirm.props.disabled).toBe(true);

  await act(async () => {
    confirm.props.onPress();
  });
  expect(drafts).toHaveLength(0);
});

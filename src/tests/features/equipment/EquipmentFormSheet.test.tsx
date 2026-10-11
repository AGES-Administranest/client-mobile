import ReactTestRenderer, { act } from 'react-test-renderer';

import { Button } from 'app/components/ui/button';
import {
  EquipmentFormSheet,
  type EquipmentFormTexts,
} from 'features/equipment/components/EquipmentFormSheet';
import type { EquipmentFormMode } from 'features/equipment/domain/equipment.types';

const TEXTS: EquipmentFormTexts = {
  title: 'Novo equipamento',
  confirm: 'Confirmar',
  startEdit: 'Editar',
  delete: 'Excluir',
  close: 'Fechar',
  labels: {
    name: 'Nome do equipamento',
    purchaseValue: 'Valor de compra (R$)',
    acquisitionDate: 'Data de aquisição',
    usefulLifeYears: 'Vida útil estimada',
    notes: 'Observações',
  },
  placeholders: {
    name: 'Ex: Vaporizador Matrx VIP 3000',
    purchaseValue: '0,00',
    acquisitionDate: 'DD/MM/AAAA',
    usefulLifeYears: 'Ex.: 5 anos',
    notes: 'Calibração, garantia, etc.',
  },
  usefulLifeHint: 'Se não informar, consideramos 10 anos (10% ao ano)',
};

const BASE = {
  visible: true,
  mode: 'create' as EquipmentFormMode,
  values: {
    name: '',
    purchaseValue: '',
    acquisitionDate: '',
    usefulLifeYears: '',
    notes: '',
  },
  errors: {},
  texts: TEXTS,
  usefulLifeNotice: null,
  previewLabel: 'Depreciação estimada:',
  previewValue: '—',
  previewNote: null,
  usefulLifeViewText: null,
  submitErrorText: null,
  isSubmitting: false,
  onChangeText: () => {},
  onBlur: () => {},
  onStartEdit: () => {},
  onSubmit: () => {},
  onClose: () => {},
};

async function renderSheet(
  props: Partial<React.ComponentProps<typeof EquipmentFormSheet>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <EquipmentFormSheet {...BASE} {...props} />,
    );
  });
  return renderer!;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat();
}

function confirmButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props?.role === 'button' &&
      node.findAll(
        child =>
          typeof child.type === 'string' &&
          child.props?.children === TEXTS.confirm,
      ).length > 0,
  );
}

function input(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props?.accessibilityLabel === label && node.props?.onChangeText,
  );
}

test('shows the title, the five labeled fields and the confirm button', async () => {
  const renderer = await renderSheet();

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      'Novo equipamento',
      'Nome do equipamento',
      'Valor de compra (R$)',
      'Data de aquisição',
      'Vida útil estimada',
      'Observações',
      'Confirmar',
    ]),
  );
});

test('the fields follow the order name, value, date, notes, useful life', async () => {
  const renderer = await renderSheet();

  const labels = renderer.root
    .findAll(
      node =>
        typeof node.props?.accessibilityLabel === 'string' &&
        typeof node.props?.onChangeText === 'function',
    )
    .map(node => node.props.accessibilityLabel);

  expect([...new Set(labels)]).toEqual([
    'Nome do equipamento',
    'Valor de compra (R$)',
    'Data de aquisição',
    'Observações',
    'Vida útil estimada',
  ]);
});

test('the edit mode shows its own title and button', async () => {
  const renderer = await renderSheet({
    mode: 'edit',
    texts: { ...TEXTS, title: 'Editar equipamento', confirm: 'Salvar' },
  });

  expect(texts(renderer)).toContain('Editar equipamento');
  expect(texts(renderer)).toContain('Salvar');
  expect(texts(renderer)).not.toContain('Novo equipamento');
});

test('the ✓ icon is on the create button and not on the edit button', async () => {
  const create = await renderSheet();
  const edit = await renderSheet({
    mode: 'edit',
    texts: { ...TEXTS, confirm: 'Salvar' },
  });

  expect(create.root.findByType(Button).props.icon).toBeDefined();
  expect(edit.root.findByType(Button).props.icon).toBeUndefined();
});

test('notes is a single-line input with the same style as the others', async () => {
  const renderer = await renderSheet();
  const notes = input(renderer, TEXTS.labels.notes);
  const name = input(renderer, TEXTS.labels.name);

  expect(notes.props.multiline).toBeFalsy();
  expect(notes.props.maxLength).toBe(1000);
  expect(notes.props.className).toBe(name.props.className);
});

test('has no delete or inactivate button', async () => {
  const renderer = await renderSheet();
  const buttons = renderer.root.findAll(
    node =>
      (node.props?.role === 'button' ||
        node.props?.accessibilityRole === 'button') &&
      typeof node.props?.onPress === 'function',
  );

  const labels = buttons.map(node =>
    node
      .findAllByType('Text' as never)
      .map(text => text.props.children)
      .join(''),
  );
  expect(labels.join('|')).not.toMatch(/exclu|inativ|delete|remov/i);
});

test('shows the error below its field', async () => {
  const renderer = await renderSheet({
    errors: { name: 'Informe o nome do equipamento.' },
  });

  expect(texts(renderer)).toContain('Informe o nome do equipamento.');
  expect(input(renderer, TEXTS.labels.name).props.className).toContain(
    'border-destructive',
  );
  expect(input(renderer, TEXTS.labels.notes).props.className).toContain(
    'border-details-primary',
  );
});

test('shows the 10 years hint, or the legacy notice in its place', async () => {
  const hint = await renderSheet();
  expect(texts(hint)).toContain(TEXTS.usefulLifeHint);

  const legacy = await renderSheet({
    usefulLifeNotice: 'Vida útil atual: 18 meses. Informe em anos para alterar',
  });
  expect(texts(legacy)).toContain(
    'Vida útil atual: 18 meses. Informe em anos para alterar',
  );
  expect(texts(legacy)).not.toContain(TEXTS.usefulLifeHint);
});

test('renders the preview, with only the value in semibold, and its note', async () => {
  const renderer = await renderSheet({
    previewValue: 'R$ 0,00/mês',
    previewNote: 'Vida útil já encerrada',
  });

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      'Depreciação estimada:',
      'R$ 0,00/mês',
      'Vida útil já encerrada',
    ]),
  );
  const value = renderer.root.find(
    node =>
      typeof node.props?.className === 'string' &&
      node.props.children === 'R$ 0,00/mês',
  );
  expect(value.props.className).toContain('font-semibold');
  expect(value.props.className).toContain('text-label-tertiary');
  const label = renderer.root.find(
    node =>
      typeof node.props?.className === 'string' &&
      Array.isArray(node.props.children) &&
      node.props.children[0] === 'Depreciação estimada:',
  );
  expect(label.props.className).not.toContain('font-semibold');
  expect(label.props.className).toContain('text-xs');
});

test('shows the submit error inside the sheet', async () => {
  const renderer = await renderSheet({
    submitErrorText: 'Não foi possível salvar o equipamento.',
  });

  expect(texts(renderer)).toContain('Não foi possível salvar o equipamento.');
});

test('the confirm button is disabled while submitting', async () => {
  const idle = await renderSheet();
  const busy = await renderSheet({ isSubmitting: true });

  expect(confirmButton(idle).props.disabled).toBeFalsy();
  expect(confirmButton(busy).props.disabled).toBe(true);
});

test('the confirm button calls onSubmit', async () => {
  const onSubmit = jest.fn();
  const renderer = await renderSheet({ onSubmit });

  await act(async () => {
    confirmButton(renderer).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('typing and leaving a field reach the handlers with the field name', async () => {
  const onChangeText = jest.fn();
  const onBlur = jest.fn();
  const renderer = await renderSheet({ onChangeText, onBlur });
  const field = input(renderer, TEXTS.labels.purchaseValue);

  await act(async () => {
    field.props.onChangeText('1000');
    field.props.onBlur();
  });

  expect(onChangeText).toHaveBeenCalledWith('purchaseValue', '1000');
  expect(onBlur).toHaveBeenCalledWith('purchaseValue');
});

test('numeric keyboards for value, date and useful life', async () => {
  const renderer = await renderSheet();

  expect(input(renderer, TEXTS.labels.purchaseValue).props.keyboardType).toBe(
    'decimal-pad',
  );
  expect(input(renderer, TEXTS.labels.acquisitionDate).props.keyboardType).toBe(
    'number-pad',
  );
  expect(input(renderer, TEXTS.labels.usefulLifeYears).props.keyboardType).toBe(
    'number-pad',
  );
});

describe('view mode', () => {
  const VIEW_VALUES = {
    name: 'Vaporizador Matrx VIP 3000',
    purchaseValue: '8.500,00',
    acquisitionDate: '01/03/2022',
    usefulLifeYears: '10',
    notes: 'Calibração anual',
  };

  function viewProps(
    extra: Partial<React.ComponentProps<typeof EquipmentFormSheet>> = {},
  ) {
    return {
      mode: 'view' as const,
      values: VIEW_VALUES,
      texts: { ...TEXTS, title: 'Detalhes do equipamento' },
      usefulLifeViewText: '10 anos',
      previewValue: 'R$ 70,83/mês',
      ...extra,
    };
  }

  test('every field is read-only and filled, with no keyboard on focus', async () => {
    const renderer = await renderSheet(viewProps());

    for (const label of Object.values(TEXTS.labels)) {
      const field = input(renderer, label);
      expect(field.props.editable).toBe(false);
      expect(field.props.showSoftInputOnFocus).toBe(false);
    }
    expect(input(renderer, TEXTS.labels.name).props.value).toBe(
      'Vaporizador Matrx VIP 3000',
    );
    expect(input(renderer, TEXTS.labels.notes).props.value).toBe(
      'Calibração anual',
    );
  });

  test('the fields do not look disabled: same style, no opacity', async () => {
    const view = await renderSheet(viewProps());
    const create = await renderSheet();

    const viewClass = input(view, TEXTS.labels.name).props.className;
    expect(viewClass).toBe(input(create, TEXTS.labels.name).props.className);
    expect(viewClass).not.toMatch(/opacity/);
  });

  test('shows the title and only the Editar button, without icon', async () => {
    const renderer = await renderSheet(viewProps());

    expect(texts(renderer)).toContain('Detalhes do equipamento');
    expect(texts(renderer)).not.toContain('Editar equipamento');
    expect(texts(renderer)).toContain('Editar');
    expect(texts(renderer)).not.toContain('Confirmar');
    expect(texts(renderer)).not.toContain('Salvar');
    expect(texts(renderer)).not.toContain('Excluir');
    const buttons = renderer.root.findAllByType(Button);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.icon).toBeUndefined();
  });

  test('Editar calls onStartEdit', async () => {
    const onStartEdit = jest.fn();
    const renderer = await renderSheet(viewProps({ onStartEdit }));

    await act(async () => {
      renderer.root.findByType(Button).props.onPress();
    });

    expect(onStartEdit).toHaveBeenCalledTimes(1);
  });

  test('Excluir only appears when onDelete is given, in the red variant', async () => {
    const without = await renderSheet(viewProps());
    expect(texts(without)).not.toContain('Excluir');

    const onDelete = jest.fn();
    const withDelete = await renderSheet(viewProps({ onDelete }));
    expect(texts(withDelete)).toContain('Excluir');
    const [, remove] = withDelete.root.findAllByType(Button);
    expect(remove.props.variant).toBe('secondary');
    await act(async () => {
      remove.props.onPress();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('shows the useful life with its unit, and months when they are not whole years', async () => {
    const years = await renderSheet(viewProps());
    expect(input(years, TEXTS.labels.usefulLifeYears).props.value).toBe(
      '10 anos',
    );

    const months = await renderSheet(
      viewProps({
        values: { ...VIEW_VALUES, usefulLifeYears: '' },
        usefulLifeViewText: '18 meses',
      }),
    );
    expect(input(months, TEXTS.labels.usefulLifeYears).props.value).toBe(
      '18 meses',
    );
  });

  test('has no 10 years hint, no legacy notice and no placeholder', async () => {
    const renderer = await renderSheet(
      viewProps({ usefulLifeNotice: 'Vida útil atual: 18 meses…' }),
    );

    expect(texts(renderer)).not.toContain(TEXTS.usefulLifeHint);
    expect(texts(renderer)).not.toContain('Vida útil atual: 18 meses…');
    expect(input(renderer, TEXTS.labels.notes).props.placeholder).toBe('');
  });

  test('shows the current monthly depreciation, in the discreet style', async () => {
    const renderer = await renderSheet(viewProps());

    expect(texts(renderer)).toEqual(
      expect.arrayContaining(['Depreciação estimada:', 'R$ 70,83/mês']),
    );
  });

  test('switching from view to edit keeps the sheet and frees the fields', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EquipmentFormSheet {...BASE} {...viewProps()} />,
      );
    });
    expect(input(renderer!, TEXTS.labels.name).props.editable).toBe(false);

    await act(async () => {
      renderer.update(
        <EquipmentFormSheet
          {...BASE}
          {...viewProps({
            mode: 'edit',
            texts: { ...TEXTS, title: 'Editar equipamento', confirm: 'Salvar' },
            usefulLifeViewText: null,
          })}
        />,
      );
    });

    expect(input(renderer!, TEXTS.labels.name).props.editable).toBe(true);
    expect(texts(renderer!)).toContain('Salvar');
    expect(texts(renderer!)).not.toContain('Editar');
    expect(renderer!.root.findByType(Button).props.icon).toBeUndefined();
    expect(texts(renderer!)).toContain(TEXTS.usefulLifeHint);
  });
});

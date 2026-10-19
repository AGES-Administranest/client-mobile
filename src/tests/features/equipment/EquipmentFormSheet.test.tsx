import { Check, Pencil, Trash2, X } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import {
  EquipmentFormSheet,
  type EquipmentFormTexts,
} from 'features/equipment/components/EquipmentFormSheet';
import type { EquipmentFormMode } from 'features/equipment/domain/equipment.types';

const TEXTS: EquipmentFormTexts = {
  title: 'Novo equipamento',
  confirm: 'Confirmar',
  startEdit: 'Editar',
  cancel: 'Cancelar',
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
  onCancelEdit: () => {},
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

function iconsOf(button: ReactTestRenderer.ReactTestInstance) {
  return button.findAllByType(Icon).map(node => node.props.as);
}

test('the create sheet has only the ✓ Confirmar button, no Cancelar and no Excluir', async () => {
  const renderer = await renderSheet({
    onDelete: () => {},
    onCancelEdit: () => {},
  });

  const buttons = renderer.root.findAllByType(Button);
  expect(buttons).toHaveLength(1);
  expect(iconsOf(buttons[0])).toEqual([Check]);
  expect(texts(renderer)).not.toContain('Cancelar');
  expect(texts(renderer)).not.toContain('Excluir');
});

test('notes is a single-line input with the same style as the others', async () => {
  const renderer = await renderSheet();
  const notes = input(renderer, TEXTS.labels.notes);
  const name = input(renderer, TEXTS.labels.name);

  expect(notes.props.multiline).toBeFalsy();
  expect(notes.props.maxLength).toBe(1000);
  expect(notes.props.className).toBe(name.props.className);
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
      texts: { ...TEXTS, title: 'Vaporizador Matrx VIP 3000' },
      usefulLifeViewText: '10 anos',
      previewValue: 'R$ 70,83/mês',
      ...extra,
    };
  }

  function hasField(
    renderer: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ) {
    return (
      renderer.root.findAll(
        node =>
          node.props?.accessibilityLabel === label &&
          typeof node.props?.onChangeText === 'function',
      ).length > 0
    );
  }

  test('the title is the equipment name and the name is not a field', async () => {
    const renderer = await renderSheet(viewProps());

    expect(texts(renderer)).toContain('Vaporizador Matrx VIP 3000');
    expect(texts(renderer)).not.toContain(TEXTS.labels.name);
    expect(hasField(renderer, TEXTS.labels.name)).toBe(false);
    expect(hasField(renderer, TEXTS.labels.purchaseValue)).toBe(true);
  });

  test('the other fields are read-only and filled, with no keyboard on focus', async () => {
    const renderer = await renderSheet(viewProps());

    const readOnlyLabels = Object.values(TEXTS.labels).filter(
      text => text !== TEXTS.labels.name,
    );
    for (const label of readOnlyLabels) {
      const field = input(renderer, label);
      expect(field.props.editable).toBe(false);
      expect(field.props.showSoftInputOnFocus).toBe(false);
    }
    expect(input(renderer, TEXTS.labels.notes).props.value).toBe(
      'Calibração anual',
    );
  });

  test('the fields do not look disabled: same style, no opacity', async () => {
    const view = await renderSheet(viewProps());
    const create = await renderSheet();

    const viewClass = input(view, TEXTS.labels.notes).props.className;
    expect(viewClass).toBe(input(create, TEXTS.labels.notes).props.className);
    expect(viewClass).not.toMatch(/opacity/);
  });

  test('has Editar with the pencil and, with onDelete, Excluir in red with the trash below it', async () => {
    const without = await renderSheet(viewProps());
    expect(texts(without)).toContain('Editar');
    expect(texts(without)).not.toContain('Excluir');
    expect(without.root.findAllByType(Button)).toHaveLength(1);

    const renderer = await renderSheet(viewProps({ onDelete: () => {} }));
    const [edit, remove] = renderer.root.findAllByType(Button);
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(['Editar', 'Excluir']),
    );
    expect(iconsOf(edit)).toEqual([Pencil]);
    expect(iconsOf(remove)).toEqual([Trash2]);
    expect(remove.props.variant).toBe('secondary');
    expect(texts(renderer)).not.toContain('Salvar');
    expect(texts(renderer)).not.toContain('Cancelar');
    expect(texts(renderer)).not.toContain('Confirmar');
  });

  test('Excluir calls onDelete', async () => {
    const onDelete = jest.fn();
    const renderer = await renderSheet(viewProps({ onDelete }));

    await act(async () => {
      renderer.root.findAllByType(Button)[1].props.onPress();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('Editar calls onStartEdit', async () => {
    const onStartEdit = jest.fn();
    const renderer = await renderSheet(viewProps({ onStartEdit }));

    await act(async () => {
      renderer.root.findByType(Button).props.onPress();
    });

    expect(onStartEdit).toHaveBeenCalledTimes(1);
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
});

describe('edit mode', () => {
  const EDIT_VALUES = {
    name: 'Vaporizador Matrx VIP 3000',
    purchaseValue: '8.500,00',
    acquisitionDate: '01/03/2022',
    usefulLifeYears: '10',
    notes: '',
  };

  function editProps(
    extra: Partial<React.ComponentProps<typeof EquipmentFormSheet>> = {},
  ) {
    return {
      mode: 'edit' as const,
      values: EDIT_VALUES,
      texts: { ...TEXTS, title: 'Editar equipamento', confirm: 'Salvar' },
      ...extra,
    };
  }

  test('brings the name field back, editable, and keeps the field order', async () => {
    const renderer = await renderSheet(editProps());

    expect(input(renderer, TEXTS.labels.name).props.editable).toBe(true);
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

  test('has Salvar with the check and, below it, Cancelar with the X, and never Excluir', async () => {
    const renderer = await renderSheet(editProps({ onDelete: () => {} }));

    const [save, cancel] = renderer.root.findAllByType(Button);
    expect(renderer.root.findAllByType(Button)).toHaveLength(2);
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(['Salvar', 'Cancelar']),
    );
    expect(texts(renderer)).not.toContain('Excluir');
    expect(texts(renderer)).not.toContain('Editar');
    expect(iconsOf(save)).toEqual([Check]);
    expect(iconsOf(cancel)).toEqual([X]);
    expect(cancel.props.variant).toBeUndefined();
  });

  test('Cancelar calls onCancelEdit and Salvar calls onSubmit', async () => {
    const onCancelEdit = jest.fn();
    const onSubmit = jest.fn();
    const renderer = await renderSheet(editProps({ onCancelEdit, onSubmit }));
    const [save, cancel] = renderer.root.findAllByType(Button);

    await act(async () => {
      cancel.props.onPress();
      save.props.onPress();
    });

    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('Salvar and Cancelar are disabled while saving and enabled otherwise', async () => {
    const saving = await renderSheet(editProps({ isSubmitting: true }));
    const [save, cancel] = saving.root.findAllByType(Button);
    expect(save.props.disabled).toBe(true);
    expect(cancel.props.disabled).toBe(true);

    const idle = await renderSheet(editProps());
    const [idleSave, idleCancel] = idle.root.findAllByType(Button);
    expect(idleSave.props.disabled).toBeFalsy();
    expect(idleCancel.props.disabled).toBeFalsy();
  });

  test('calls onClosed once the sheet finished closing, and not while it is open', async () => {
    const onClosed = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EquipmentFormSheet {...BASE} {...editProps()} onClosed={onClosed} />,
      );
    });
    expect(onClosed).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(
        <EquipmentFormSheet
          {...BASE}
          {...editProps()}
          visible={false}
          onClosed={onClosed}
        />,
      );
    });

    // Nos testes a animação termina na hora, como no useSheetAnimation.test.
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  test('switching from view to edit keeps the sheet, brings the name field and Salvar', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EquipmentFormSheet
          {...BASE}
          mode="view"
          values={EDIT_VALUES}
          usefulLifeViewText="10 anos"
          texts={{ ...TEXTS, title: 'Vaporizador Matrx VIP 3000' }}
        />,
      );
    });
    expect(
      renderer!.root.findAll(
        node => node.props?.accessibilityLabel === TEXTS.labels.name,
      ),
    ).toHaveLength(0);
    expect(input(renderer!, TEXTS.labels.purchaseValue).props.editable).toBe(
      false,
    );

    await act(async () => {
      renderer.update(
        <EquipmentFormSheet
          {...BASE}
          mode="edit"
          values={EDIT_VALUES}
          texts={{ ...TEXTS, title: 'Editar equipamento', confirm: 'Salvar' }}
        />,
      );
    });

    expect(input(renderer!, TEXTS.labels.name).props.editable).toBe(true);
    expect(input(renderer!, TEXTS.labels.purchaseValue).props.editable).toBe(
      true,
    );
    expect(texts(renderer!)).toContain('Editar equipamento');
    expect(texts(renderer!)).toContain('Salvar');
    expect(texts(renderer!)).not.toContain('Editar');
    expect(texts(renderer!)).toContain(TEXTS.usefulLifeHint);
  });
});

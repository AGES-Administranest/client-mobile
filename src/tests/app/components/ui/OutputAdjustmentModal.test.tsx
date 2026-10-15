import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { OutputAdjustmentModal } from '../../../../app/components/ui/OutputAdjustmentModal';
import {
  EMPTY_OUTPUT_ADJUSTMENT,
  type AdjustmentReason,
  type OutputAdjustmentDraft,
  type OutputAdjustmentErrors,
} from '../../../../features/stock/domain/outputAdjustment';
import type { AdjustableItem } from '../../../../features/stock/services/stockAdjustmentService';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ITEMS: AdjustableItem[] = [
  {
    id: 'item-1',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    availableQuantity: 8,
    unitCost: 10,
  },
  {
    id: 'item-2',
    name: 'Gaze estéril',
    unit: 'box',
    availableQuantity: 6,
    unitCost: 10,
  },
];

const REASON_LABELS: Record<AdjustmentReason, string> = {
  loss: 'Perda',
  expiration: 'Vencimento',
  breakage: 'Quebra',
  other: 'Outro',
};

const ERROR_MESSAGES = {
  required: 'Campo obrigatório',
  mustBePositive: 'A quantidade deve ser maior que zero',
};

type Overrides = {
  draft?: Partial<OutputAdjustmentDraft>;
  errors?: OutputAdjustmentErrors;
  needsWrittenReason?: boolean;
  isSaving?: boolean;
  failureMessage?: string | null;
  handlers?: Partial<{
    onSubmit: () => void;
    onClose: () => void;
    onItemChange: (itemId: string) => void;
    onQuantityChange: (quantity: string) => void;
    onReasonChange: (reason: AdjustmentReason) => void;
    onOtherReasonChange: (otherReason: string) => void;
  }>;
};

async function render({
  draft = {},
  errors = {},
  needsWrittenReason = false,
  isSaving = false,
  failureMessage = null,
  handlers = {},
}: Overrides = {}) {
  const spies = {
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    onItemChange: jest.fn(),
    onQuantityChange: jest.fn(),
    onReasonChange: jest.fn(),
    onOtherReasonChange: jest.fn(),
    ...handlers,
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <OutputAdjustmentModal
          visible
          draft={{ ...EMPTY_OUTPUT_ADJUSTMENT, ...draft }}
          items={ITEMS}
          errors={errors}
          isSaving={isSaving}
          needsWrittenReason={needsWrittenReason}
          failureMessage={failureMessage}
          title="Registro de ajuste de saída"
          itemLabel="Item"
          itemPlaceholder="Selecione o item"
          quantityLabel="Quantidade"
          quantityPlaceholder="0"
          reasonLabel="Motivo"
          otherReasonLabel="Descreva o motivo"
          otherReasonPlaceholder="Escreva o que aconteceu"
          saveLabel="Salvar"
          closeLabel="Fechar"
          reasonLabels={REASON_LABELS}
          errorMessages={ERROR_MESSAGES}
          {...spies}
        />
      </SafeAreaProvider>,
    );
  });

  return { renderer: renderer!, spies };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function byLabel(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      (typeof node.props.onPress === 'function' ||
        typeof node.props.onChangeText === 'function'),
  );
}

function saveButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === 'Salvar'),
    )!;
}

function stringTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

test('opens with the title as the sheet header', async () => {
  const { renderer } = await render();

  const headers = renderer.root
    .findAllByType('Text' as never)
    .filter(node => node.props.accessibilityRole === 'header')
    .map(node => node.props.children);

  expect(headers).toEqual(['Registro de ajuste de saída']);
});

test('lists the registered items in the dropdown', async () => {
  const { renderer, spies } = await render();

  expect(textsOf(renderer)).toContain('Selecione o item');

  await act(() => {
    byLabel(renderer, 'Item').props.onPress();
  });

  const texts = textsOf(renderer);

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('Gaze estéril');

  await act(() => {
    renderer.root
      .find(node => node.props.testID === 'item-option-item-2')
      .props.onPress();
  });

  expect(spies.onItemChange).toHaveBeenCalledWith('item-2');
});

test('shows the chosen item instead of the placeholder', async () => {
  const { renderer } = await render({ draft: { itemId: 'item-1' } });

  const texts = textsOf(renderer);

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).not.toContain('Selecione o item');
});

test('offers the four reasons', async () => {
  const { renderer, spies } = await render();

  const texts = textsOf(renderer);

  expect(texts).toContain('Perda');
  expect(texts).toContain('Vencimento');
  expect(texts).toContain('Quebra');
  expect(texts).toContain('Outro');

  await act(() => {
    byLabel(renderer, 'Vencimento').props.onPress();
  });

  expect(spies.onReasonChange).toHaveBeenCalledWith('expiration');
});

test('marks the selected reason', async () => {
  const { renderer } = await render({ draft: { reason: 'breakage' } });

  expect(byLabel(renderer, 'Quebra').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(byLabel(renderer, 'Perda').props.accessibilityState).toEqual({
    selected: false,
  });
});

test('hides the written reason field unless it is needed', async () => {
  const { renderer } = await render({ needsWrittenReason: false });

  expect(textsOf(renderer)).not.toContain('Descreva o motivo');
});

test('shows the written reason field when "Outro" is picked', async () => {
  const { renderer, spies } = await render({
    draft: { reason: 'other' },
    needsWrittenReason: true,
  });

  expect(textsOf(renderer)).toContain('Descreva o motivo');

  await act(() => {
    byLabel(renderer, 'Descreva o motivo').props.onChangeText('Frasco trocado');
  });

  expect(spies.onOtherReasonChange).toHaveBeenCalledWith('Frasco trocado');
});

test('keeps the quantity field numeric', async () => {
  const { renderer, spies } = await render();
  const quantity = byLabel(renderer, 'Quantidade');

  expect(quantity.props.keyboardType).toBe('number-pad');
  expect(quantity.props.inputMode).toBe('numeric');

  await act(() => {
    quantity.props.onChangeText('12a');
  });

  expect(spies.onQuantityChange).toHaveBeenCalledWith('12a');
});

test('shows the validation message of each field', async () => {
  const { renderer } = await render({
    errors: {
      itemId: 'required',
      quantity: 'mustBePositive',
      reason: 'required',
    },
  });

  const texts = textsOf(renderer);

  expect(texts).toContain('Campo obrigatório');
  expect(texts).toContain('A quantidade deve ser maior que zero');
});

test('shows the failure returned by the save right above Salvar', async () => {
  const { renderer } = await render({
    failureMessage: 'Quantidade maior que o saldo disponível (8).',
  });

  expect(stringTexts(renderer).slice(-2)).toEqual([
    'Quantidade maior que o saldo disponível (8).',
    'Salvar',
  ]);
});

test('submits through Salvar', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    saveButton(renderer).props.onPress();
  });

  expect(spies.onSubmit).toHaveBeenCalledTimes(1);
});

test('closes through the backdrop', async () => {
  const { renderer, spies } = await render();

  await act(() => {
    byLabel(renderer, 'Fechar').props.onPress();
  });

  expect(spies.onClose).toHaveBeenCalledTimes(1);
});

test('locks Salvar while saving', async () => {
  const { renderer } = await render({ isSaving: true });

  expect(saveButton(renderer).props.disabled).toBe(true);
});

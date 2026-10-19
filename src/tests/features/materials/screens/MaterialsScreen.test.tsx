import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { EquipmentFormSheet } from 'features/equipment';
import { equipmentService } from 'features/equipment/services/equipmentService';
import { MaterialsScreen } from 'features/materials';
import { fetchItems } from 'features/materials/services/itemService';
import { I18nProvider } from 'shared/i18n';

// A tela carrega o estoque no mount; sem isto o teste bate na rede real e
// cai no estado de erro em vez do estado vazio que ele descreve.
jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));

jest.mock('features/equipment/services/equipmentService', () => ({
  equipmentService: {
    list: jest.fn(),
    summary: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  },
}));

// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

// The stock-entry sheets on this page read the safe-area insets.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;
const equipmentListMock = equipmentService.list as jest.MockedFunction<
  typeof equipmentService.list
>;
const equipmentCreateMock = equipmentService.create as jest.MockedFunction<
  typeof equipmentService.create
>;
const equipmentUpdateMock = equipmentService.update as jest.MockedFunction<
  typeof equipmentService.update
>;
const equipmentDeactivateMock =
  equipmentService.deactivate as jest.MockedFunction<
    typeof equipmentService.deactivate
  >;
const equipmentSummaryMock = equipmentService.summary as jest.MockedFunction<
  typeof equipmentService.summary
>;

const EQUIPMENT_FIXTURE = {
  id: 'eq-1',
  supplierId: null,
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: 8500,
  salvageValue: 0,
  acquisitionDate: '2022-03-01T00:00:00.000Z',
  usefulLifeMonths: 120,
  notes: null,
  active: true,
  monthlyDepreciation: 0,
  currentValue: 0,
  usefulLifeUsedPct: 100,
  endOfLife: true,
};

beforeEach(() => {
  fetchItemsMock.mockReset();
  fetchItemsMock.mockResolvedValue([]);
  equipmentListMock.mockReset();
  equipmentSummaryMock.mockReset();
  equipmentCreateMock.mockReset();
  equipmentUpdateMock.mockReset();
  equipmentDeactivateMock.mockReset();
  equipmentDeactivateMock.mockResolvedValue(undefined);
  equipmentListMock.mockResolvedValue([EQUIPMENT_FIXTURE]);
  equipmentSummaryMock.mockResolvedValue({
    monthlyTotal: 0,
    yearlyTotal: 0,
    count: 1,
  });
});

async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <MaterialsScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer!;
}

function getTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

// A pill is the only button here that reports whether it is selected — the
// page's action buttons (add, stock entry) are plain buttons.
function getCategoryPills(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityState?.selected !== undefined &&
      typeof node.props.onPress === 'function',
  );
}

function getSegmentTabs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );
}

test('defaults to the supplies segment with only the "Todos" category and an empty list', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  expect(segmentTabs[0].props.accessibilityState).toEqual({ selected: true });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills).toHaveLength(1);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });

  expect(getTexts(renderer)).toContain('Nenhum item encontrado');
});

test('switching to equipment replaces the category filter with the equipment list', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  await act(async () => {
    segmentTabs[1].props.onPress();
  });

  expect(getCategoryPills(renderer)).toHaveLength(0);
  const texts = getTexts(renderer);
  expect(texts).toContain('Depreciação total/mês');
  expect(texts).toContain('Vaporizador Matrx VIP 3000');
  expect(texts).toContain('Fim da vida útil');
  expect(texts).toContain('Adicionar equipamento');
});

test('a rejected session shows the session message instead of an empty list', async () => {
  const { ApiError } = jest.requireActual<
    typeof import('shared/services/apiClient')
  >('shared/services/apiClient');
  fetchItemsMock.mockRejectedValue(
    new ApiError('Token expired', 'TOKEN_EXPIRED', 401),
  );

  const renderer = await renderScreen();

  expect(getTexts(renderer)).toContain('Sua sessão expirou');
  expect(getTexts(renderer)).not.toContain('Nenhum item encontrado');
});

async function openEquipmentTab() {
  const renderer = await renderScreen();
  await act(async () => {
    getSegmentTabs(renderer)[1].props.onPress();
  });
  return renderer;
}

function pressText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const target = renderer.root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props?.children === label,
      ).length > 0,
  );
  return act(async () => {
    target.props.onPress();
  });
}

test('"Adicionar equipamento" opens the form sheet in create mode', async () => {
  const renderer = await openEquipmentTab();
  expect(getTexts(renderer)).not.toContain('Novo equipamento');

  await pressText(renderer, 'Adicionar equipamento');

  expect(getTexts(renderer)).toContain('Novo equipamento');
  expect(getTexts(renderer)).toContain('Confirmar');
});

function sheetProps(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(EquipmentFormSheet).props as {
    visible: boolean;
    mode: string;
    texts: { title: string };
    previewValue: string;
  };
}

function hasNameField(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root.findAll(
      node =>
        node.props?.accessibilityLabel === 'Nome do equipamento' &&
        typeof node.props?.onChangeText === 'function',
    ).length > 0
  );
}

test('tapping an equipment card opens the details: name as the title, no name field, Editar and Excluir', async () => {
  const renderer = await openEquipmentTab();

  await pressText(renderer, 'Vaporizador Matrx VIP 3000');

  expect(sheetProps(renderer).mode).toBe('view');
  expect(sheetProps(renderer).texts.title).toBe('Vaporizador Matrx VIP 3000');
  expect(hasNameField(renderer)).toBe(false);
  const texts = getTexts(renderer);
  expect(texts).toContain('Editar');
  expect(texts).toContain('Excluir');
  expect(texts).not.toContain('Salvar');
  expect(texts).not.toContain('Cancelar');
  expect(texts).not.toContain('Editar equipamento');
  const purchase = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Valor de compra (R$)' &&
      node.props?.onChangeText,
  );
  expect(purchase.props.editable).toBe(false);
});

test('Editar frees the fields, brings the name back and the button becomes Salvar', async () => {
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');

  await pressText(renderer, 'Editar');

  expect(sheetProps(renderer).mode).toBe('edit');
  expect(sheetProps(renderer).texts.title).toBe('Editar equipamento');
  expect(getTexts(renderer)).toContain('Salvar');
  expect(isSheetOpen(renderer)).toBe(true);
  const nameInput = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Nome do equipamento' &&
      node.props?.onChangeText,
  );
  expect(nameInput.props.value).toBe('Vaporizador Matrx VIP 3000');
  expect(nameInput.props.editable).toBe(true);
});

function confirmSheet(renderer: ReactTestRenderer.ReactTestRenderer) {
  // A tela também tem o ConfirmSheet da exclusão de insumo.
  const sheet = renderer.root
    .findAllByType(ConfirmSheet)
    .find(node => node.props.title === 'Excluir equipamento?');
  return sheet!.props as {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
}

async function openEditing(renderer: ReactTestRenderer.ReactTestRenderer) {
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
}

async function openDetails(renderer: ReactTestRenderer.ReactTestRenderer) {
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
}

// Nos testes a animação de fechar termina na hora, então "o sheet fechou"
// (onClosed) já aconteceu quando o act termina.
function pressDelete(renderer: ReactTestRenderer.ReactTestRenderer) {
  return act(async () => {
    renderer.root.findByType(EquipmentFormSheet).props.onDelete();
  });
}

function confirmDelete(renderer: ReactTestRenderer.ReactTestRenderer) {
  return act(async () => {
    confirmSheet(renderer).onConfirm();
  });
}

function cancelDelete(renderer: ReactTestRenderer.ReactTestRenderer) {
  return act(async () => {
    confirmSheet(renderer).onCancel();
  });
}

test('Excluir shows up only in the details; edit has Salvar and Cancelar; create has neither', async () => {
  const renderer = await openEquipmentTab();

  await pressText(renderer, 'Adicionar equipamento');
  expect(getTexts(renderer)).not.toContain('Excluir');
  expect(getTexts(renderer)).not.toContain('Cancelar');
  await act(async () => {
    renderer.root.findByType(EquipmentFormSheet).props.onClose();
  });

  await openDetails(renderer);
  expect(getTexts(renderer)).toContain('Excluir');
  expect(getTexts(renderer)).toContain('Editar');

  await pressText(renderer, 'Editar');
  expect(getTexts(renderer)).not.toContain('Excluir');
  expect(getTexts(renderer)).toContain('Salvar');
  expect(getTexts(renderer)).toContain('Cancelar');
});

test('Cancelar in the edit drops the changes and goes back to the details, open, without the API', async () => {
  const renderer = await openEquipmentTab();
  await openEditing(renderer);
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await act(async () => {
    renderer.root.findByType(EquipmentFormSheet).props.onCancelEdit();
  });

  expect(isSheetOpen(renderer)).toBe(true);
  expect(sheetProps(renderer).mode).toBe('view');
  expect(sheetProps(renderer).texts.title).toBe('Vaporizador Matrx VIP 3000');
  expect(hasNameField(renderer)).toBe(false);
  expect(equipmentUpdateMock).not.toHaveBeenCalled();
});

test('Excluir closes the sheet and opens the confirmation with the equipment name, never both', async () => {
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  expect(confirmSheet(renderer).visible).toBe(false);

  await pressDelete(renderer);

  expect(isSheetOpen(renderer)).toBe(false);
  expect(confirmSheet(renderer).visible).toBe(true);
  expect(confirmSheet(renderer).title).toBe('Excluir equipamento?');
  expect(confirmSheet(renderer).message).toBe(
    '“Vaporizador Matrx VIP 3000” deixa de aparecer na lista e não entra mais na depreciação total.',
  );
  expect(confirmSheet(renderer).confirmLabel).toBe('Excluir');
  expect(confirmSheet(renderer).cancelLabel).toBe('Cancelar');
});

test('Cancelar in the confirmation closes it and reopens the same equipment in the details, without the API', async () => {
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);

  await cancelDelete(renderer);

  expect(confirmSheet(renderer).visible).toBe(false);
  expect(isSheetOpen(renderer)).toBe(true);
  expect(sheetProps(renderer).mode).toBe('view');
  expect(sheetProps(renderer).texts.title).toBe('Vaporizador Matrx VIP 3000');
  expect(equipmentDeactivateMock).not.toHaveBeenCalled();
});

test('the confirm button reads Excluindo… during the call and the confirmation stays open', async () => {
  let finish: () => void = () => {};
  equipmentDeactivateMock.mockReturnValue(
    new Promise<void>(resolve => {
      finish = resolve;
    }),
  );
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);

  let pending: Promise<void>;
  await act(async () => {
    pending = Promise.resolve(confirmSheet(renderer).onConfirm());
  });

  expect(confirmSheet(renderer).visible).toBe(true);
  expect(confirmSheet(renderer).confirmLabel).toBe('Excluindo…');
  expect(isSheetOpen(renderer)).toBe(false);

  await act(async () => {
    confirmSheet(renderer).onConfirm();
    finish();
    await pending;
  });
  expect(equipmentDeactivateMock).toHaveBeenCalledTimes(1);
});

test('confirming deactivates the equipment, refreshes the list and the total, and does not reopen the sheet', async () => {
  const other = {
    ...EQUIPMENT_FIXTURE,
    id: 'eq-2',
    name: 'Bomba de infusão',
    monthlyDepreciation: 100,
    endOfLife: false,
    usefulLifeUsedPct: 40,
  };
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE, other])
    .mockResolvedValueOnce([other]);
  equipmentSummaryMock
    .mockReset()
    .mockResolvedValueOnce({ monthlyTotal: 150, yearlyTotal: 1800, count: 2 })
    .mockResolvedValueOnce({ monthlyTotal: 100, yearlyTotal: 1200, count: 1 });
  const renderer = await openEquipmentTab();
  expect(getTexts(renderer)).toContain('2 equipamentos');
  await openDetails(renderer);
  await pressDelete(renderer);

  await confirmDelete(renderer);

  expect(equipmentDeactivateMock).toHaveBeenCalledWith('id-token', 'eq-1');
  expect(equipmentListMock).toHaveBeenCalledTimes(2);
  expect(equipmentSummaryMock).toHaveBeenCalledTimes(2);
  expect(confirmSheet(renderer).visible).toBe(false);
  expect(isSheetOpen(renderer)).toBe(false);
  const texts = getTexts(renderer);
  expect(texts).not.toContain('Vaporizador Matrx VIP 3000');
  expect(texts).toContain('Bomba de infusão');
  expect(texts).toContain('1 equipamento');
});

test('deactivating the last equipment shows the empty state with the add button', async () => {
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([]);
  equipmentSummaryMock
    .mockReset()
    .mockResolvedValueOnce({ monthlyTotal: 0, yearlyTotal: 0, count: 1 })
    .mockResolvedValueOnce({ monthlyTotal: 0, yearlyTotal: 0, count: 0 });
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);

  await confirmDelete(renderer);

  expect(isSheetOpen(renderer)).toBe(false);
  expect(confirmSheet(renderer).visible).toBe(false);
  expect(getTexts(renderer)).toContain(
    'Nenhum equipamento cadastrado. Cadastre o primeiro para acompanhar a depreciação.',
  );
  expect(getTexts(renderer)).toContain('Adicionar equipamento');
});

test('a 404 on deactivate is not an error: the list refreshes and nothing reopens', async () => {
  const { ApiError } = jest.requireActual<
    typeof import('shared/services/apiClient')
  >('shared/services/apiClient');
  equipmentDeactivateMock.mockRejectedValue(
    new ApiError('not found', 'EQUIPMENT_NOT_FOUND', 404),
  );
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([]);
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);

  await confirmDelete(renderer);

  expect(equipmentListMock).toHaveBeenCalledTimes(2);
  expect(isSheetOpen(renderer)).toBe(false);
  expect(confirmSheet(renderer).visible).toBe(false);
  expect(getTexts(renderer)).not.toContain('Não foi possível excluir');
});

test('a failed deactivate keeps the confirmation open with the message, the button back, and the equipment in the list', async () => {
  equipmentDeactivateMock.mockRejectedValue(new Error('network'));
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);

  await confirmDelete(renderer);

  expect(confirmSheet(renderer).visible).toBe(true);
  expect(confirmSheet(renderer).message).toBe(
    'Não foi possível excluir o equipamento. Tente novamente.',
  );
  expect(confirmSheet(renderer).confirmLabel).toBe('Excluir');
  expect(isSheetOpen(renderer)).toBe(false);
  expect(equipmentListMock).toHaveBeenCalledTimes(1);
  expect(getTexts(renderer)).toContain('Vaporizador Matrx VIP 3000');
});

test('after a failed deactivate, Cancelar reopens the details and trying again works', async () => {
  equipmentDeactivateMock.mockRejectedValueOnce(new Error('network'));
  const renderer = await openEquipmentTab();
  await openDetails(renderer);
  await pressDelete(renderer);
  await confirmDelete(renderer);

  await cancelDelete(renderer);

  expect(isSheetOpen(renderer)).toBe(true);
  expect(sheetProps(renderer).mode).toBe('view');
  await pressDelete(renderer);
  expect(confirmSheet(renderer).message).toContain('deixa de aparecer');
  await confirmDelete(renderer);
  expect(equipmentDeactivateMock).toHaveBeenCalledTimes(2);
});

test('saving an edit refreshes the list and goes back to the details, open, with the new values', async () => {
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([
      {
        ...EQUIPMENT_FIXTURE,
        name: 'Vaporizador novo',
        monthlyDepreciation: 12.5,
      },
    ]);
  equipmentUpdateMock.mockResolvedValue(EQUIPMENT_FIXTURE);
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await pressText(renderer, 'Salvar');

  expect(equipmentUpdateMock).toHaveBeenCalledWith(
    'id-token',
    'eq-1',
    expect.objectContaining({ name: 'Vaporizador novo' }),
  );
  expect(equipmentListMock).toHaveBeenCalledTimes(2);
  expect(isSheetOpen(renderer)).toBe(true);
  expect(sheetProps(renderer).mode).toBe('view');
  expect(sheetProps(renderer).texts.title).toBe('Vaporizador novo');
  expect(sheetProps(renderer).previewValue.replace(/\u00a0/g, ' ')).toBe(
    'R$ 12,50/mês',
  );
  expect(hasNameField(renderer)).toBe(false);
  expect(getTexts(renderer)).toContain('Editar');
  expect(getTexts(renderer)).not.toContain('Salvar');
});

test('closes the sheet when the saved equipment is no longer in the list', async () => {
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([]);
  equipmentUpdateMock.mockResolvedValue(EQUIPMENT_FIXTURE);
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await pressText(renderer, 'Salvar');

  expect(isSheetOpen(renderer)).toBe(false);
});

test('closing the sheet in edit drops the changes: the card opens in the details again', async () => {
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await act(async () => {
    renderer.root.findByType(EquipmentFormSheet).props.onClose();
  });
  expect(isSheetOpen(renderer)).toBe(false);
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');

  expect(sheetProps(renderer).mode).toBe('view');
  expect(sheetProps(renderer).texts.title).toBe('Vaporizador Matrx VIP 3000');
  expect(equipmentUpdateMock).not.toHaveBeenCalled();
});

test('a failed edit keeps the sheet in edit mode with the data and the message', async () => {
  equipmentUpdateMock.mockRejectedValue(new Error('network'));
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await pressText(renderer, 'Salvar');

  expect(isSheetOpen(renderer)).toBe(true);
  expect(sheetProps(renderer).mode).toBe('edit');
  expect(getTexts(renderer)).toContain(
    'Não foi possível salvar o equipamento.',
  );
  const nameInput = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Nome do equipamento' &&
      node.props?.onChangeText,
  );
  expect(nameInput.props.value).toBe('Vaporizador novo');
  expect(equipmentListMock).toHaveBeenCalledTimes(1);
});

function typeInto(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  text: string,
) {
  const field = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === label && node.props?.onChangeText,
  );
  return act(async () => {
    field.props.onChangeText(text);
  });
}

async function fillCreateForm(renderer: ReactTestRenderer.ReactTestRenderer) {
  await typeInto(renderer, 'Nome do equipamento', 'Bomba nova');
  await typeInto(renderer, 'Valor de compra (R$)', '600000');
  await typeInto(renderer, 'Data de aquisição', '01032022');
}

function isSheetOpen(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(EquipmentFormSheet).props.visible as boolean;
}

test('saving in the form refreshes the list and the total, then closes the sheet', async () => {
  const saved = {
    ...EQUIPMENT_FIXTURE,
    id: 'eq-2',
    name: 'Bomba nova',
  };
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE, saved]);
  equipmentSummaryMock
    .mockReset()
    .mockResolvedValueOnce({ monthlyTotal: 0, yearlyTotal: 0, count: 1 })
    .mockResolvedValueOnce({ monthlyTotal: 50, yearlyTotal: 600, count: 2 });
  equipmentCreateMock.mockResolvedValue(saved);
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Adicionar equipamento');
  await fillCreateForm(renderer);

  await pressText(renderer, 'Confirmar');

  expect(equipmentCreateMock).toHaveBeenCalledWith('id-token', {
    name: 'Bomba nova',
    purchaseValue: 6000,
    acquisitionDate: '2022-03-01',
    usefulLifeMonths: 120,
  });
  expect(equipmentListMock).toHaveBeenCalledTimes(2);
  expect(equipmentSummaryMock).toHaveBeenCalledTimes(2);
  expect(isSheetOpen(renderer)).toBe(false);
  expect(getTexts(renderer)).toContain('2 equipamentos');
});

test('a failed save keeps the sheet open with the data and does not refresh', async () => {
  equipmentCreateMock.mockRejectedValue(new Error('network'));
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Adicionar equipamento');
  await fillCreateForm(renderer);

  await pressText(renderer, 'Confirmar');

  expect(isSheetOpen(renderer)).toBe(true);
  expect(getTexts(renderer)).toContain(
    'Não foi possível salvar o equipamento.',
  );
  const name = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Nome do equipamento' &&
      node.props?.onChangeText,
  );
  expect(name.props.value).toBe('Bomba nova');
  expect(equipmentListMock).toHaveBeenCalledTimes(1);
});

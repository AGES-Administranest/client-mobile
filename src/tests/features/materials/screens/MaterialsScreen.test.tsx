import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

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

test('tapping an equipment card opens the form sheet read-only, with Editar and no Excluir', async () => {
  const renderer = await openEquipmentTab();

  await pressText(renderer, 'Vaporizador Matrx VIP 3000');

  const texts = getTexts(renderer);
  expect(texts).toContain('Detalhes do equipamento');
  expect(texts).not.toContain('Editar equipamento');
  expect(texts).toContain('Editar');
  expect(texts).not.toContain('Salvar');
  expect(texts).not.toContain('Excluir');
  const nameInput = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Nome do equipamento' &&
      node.props?.onChangeText,
  );
  expect(nameInput.props.value).toBe('Vaporizador Matrx VIP 3000');
  expect(nameInput.props.editable).toBe(false);
});

test('Editar frees the fields and the button becomes Salvar', async () => {
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');

  await pressText(renderer, 'Editar');

  expect(getTexts(renderer)).toContain('Salvar');
  expect(getTexts(renderer)).toContain('Editar equipamento');
  expect(getTexts(renderer)).not.toContain('Detalhes do equipamento');
  expect(isSheetOpen(renderer)).toBe(true);
  const nameInput = renderer.root.find(
    node =>
      node.props?.accessibilityLabel === 'Nome do equipamento' &&
      node.props?.onChangeText,
  );
  expect(nameInput.props.editable).toBe(true);
});

test('editing and saving updates the equipment, refreshes the list and closes the sheet', async () => {
  equipmentListMock
    .mockReset()
    .mockResolvedValueOnce([EQUIPMENT_FIXTURE])
    .mockResolvedValueOnce([
      { ...EQUIPMENT_FIXTURE, name: 'Vaporizador novo' },
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
  expect(isSheetOpen(renderer)).toBe(false);
  expect(getTexts(renderer)).toContain('Vaporizador novo');
});

test('a failed edit keeps the sheet open in edit mode with the data', async () => {
  equipmentUpdateMock.mockRejectedValue(new Error('network'));
  const renderer = await openEquipmentTab();
  await pressText(renderer, 'Vaporizador Matrx VIP 3000');
  await pressText(renderer, 'Editar');
  await typeInto(renderer, 'Nome do equipamento', 'Vaporizador novo');

  await pressText(renderer, 'Salvar');

  expect(isSheetOpen(renderer)).toBe(true);
  expect(getTexts(renderer)).toContain(
    'Não foi possível salvar o equipamento.',
  );
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

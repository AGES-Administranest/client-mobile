import ReactTestRenderer, { act } from 'react-test-renderer';

import type { ItemDraft } from 'app/components/ui/item-modal/item-modal';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { BackendItem } from 'features/materials';
import { createItem } from 'features/materials/services/itemService';
import type { Review, ReviewLine } from 'features/stockEntry/domain/review';
import {
  useReview,
  type ReviewState,
} from 'features/stockEntry/hooks/useReview';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/materials/services/itemService', () => ({
  ...jest.requireActual('features/materials/services/itemService'),
  createItem: jest.fn(),
}));

const createItemMock = createItem as jest.MockedFunction<typeof createItem>;

const SESSION = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Usuário Teste',
  email: 'teste@administranest.local',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

// Read from the document with a fractional quantity and nothing to link to.
const LINE: ReviewLine = {
  id: 'line-0',
  sourceIndex: 0,
  description: 'SERINGA 3ML',
  quantity: 1.5,
  unitValue: 2,
  printedTotal: null,
  link: null,
  candidates: [],
  lot: '',
  expiry: '',
};

const REVIEW: Review = {
  header: {
    supplierId: null,
    supplierName: null,
    invoiceNumber: '8842',
    orderDate: '18/08/2026',
    totalAmount: 3,
  },
  lines: [LINE],
  partial: null,
};

// The item form confirmed without touching the quantity.
const DRAFT: ItemDraft = {
  category: 'DISPOSABLE',
  name: 'Seringa 3 mL',
  supplierName: null,
  editingItemId: null,
  selectedItemId: null,
  unitCost: '2,00',
  unit: 'un',
  quantity: '',
  minQuantity: null,
  expiration: '',
};

const CREATED: BackendItem = {
  id: 'seringa-3',
  supplierId: null,
  category: 'DISPOSABLE',
  unit: 'UNIT',
  name: 'Seringa 3 mL',
  defaultUnitCost: '2.00',
  minimumStock: null,
  currentQuantity: '0',
  nearestExpiration: null,
  active: true,
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
  deletedAt: null,
};

let state: ReviewState;
let renderer: ReactTestRenderer.ReactTestRenderer;

function Harness() {
  state = useReview(REVIEW);
  return null;
}

async function openNewItem() {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });
  await act(async () => state.openLinking(LINE.id));
  await act(async () => state.startNewItem(''));
}

beforeEach(() => {
  createItemMock.mockReset().mockResolvedValue(CREATED);
});

afterEach(async () => {
  await act(async () => renderer.unmount());
});

it('keeps a fractional quantity on the line an item is created for', async () => {
  await openNewItem();

  expect(state.newItem?.quantity).toBeUndefined();

  await act(async () => state.createAndLink(DRAFT));

  expect(state.review.lines[0]).toMatchObject({
    quantity: 1.5,
    link: { itemId: 'seringa-3' },
  });
});

it('creates the item once when confirm is tapped twice', async () => {
  let respond!: (item: BackendItem) => void;
  createItemMock.mockReturnValue(
    new Promise(resolve => {
      respond = resolve;
    }),
  );
  await openNewItem();

  await act(async () => {
    state.createAndLink(DRAFT);
    state.createAndLink(DRAFT);
  });

  expect(createItemMock).toHaveBeenCalledTimes(1);
  expect(state.isCreatingItem).toBe(true);

  await act(async () => respond(CREATED));

  expect(state.isCreatingItem).toBe(false);
  expect(state.review.lines[0].link?.itemId).toBe('seringa-3');
});

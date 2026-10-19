import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Review } from 'features/stockEntry/domain/review';
import {
  useDraftAutosave,
  type DraftAutosave,
} from 'features/stockEntry/hooks/useDraftAutosave';
import {
  saveHeader,
  saveLines,
} from 'features/stockEntry/services/stockEntryService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/stockEntry/services/stockEntryService', () => ({
  saveHeader: jest.fn(),
  saveLines: jest.fn(),
}));

const saveHeaderMock = saveHeader as jest.MockedFunction<typeof saveHeader>;
const saveLinesMock = saveLines as jest.MockedFunction<typeof saveLines>;

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

const REVIEW: Review = {
  header: {
    supplierId: null,
    supplierName: null,
    invoiceNumber: '8842',
    orderDate: '18/08/2026',
    totalAmount: 490,
  },
  lines: [],
  partial: null,
};

jest.useFakeTimers();

let autosave: DraftAutosave;
let renderer: ReactTestRenderer.ReactTestRenderer;

function Harness({ review }: { review: Review }) {
  autosave = useDraftAutosave('invoice-1', review);
  return null;
}

const tree = (review: Review) => (
  <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
    <Harness review={review} />
  </AuthProvider>
);

async function mount(review = REVIEW) {
  await act(async () => {
    renderer = ReactTestRenderer.create(tree(review));
  });
}

async function edit(review: Review) {
  await act(async () => {
    renderer.update(tree(review));
  });
}

async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  saveHeaderMock.mockReset().mockResolvedValue(undefined);
  saveLinesMock.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => {
    renderer.unmount();
  });
});

it('does not save what it was opened with', async () => {
  await mount();
  await wait(2000);

  expect(saveHeaderMock).not.toHaveBeenCalled();
  expect(saveLinesMock).not.toHaveBeenCalled();
  expect(autosave.status).toBe('idle');
});

it('waits for the typing to stop, then saves only what changed', async () => {
  await mount();
  await edit({ ...REVIEW, header: { ...REVIEW.header, totalAmount: 500 } });
  await wait(500);
  await edit({ ...REVIEW, header: { ...REVIEW.header, totalAmount: 510 } });
  await wait(500);
  expect(saveHeaderMock).not.toHaveBeenCalled();

  await wait(300);

  expect(saveHeaderMock).toHaveBeenCalledTimes(1);
  expect(saveHeaderMock).toHaveBeenCalledWith('id', 'invoice-1', {
    invoiceNumber: '8842',
    orderDate: '2026-08-18',
    totalAmount: 510,
  });
  expect(saveLinesMock).not.toHaveBeenCalled();
  expect(autosave.status).toBe('saved');
});

it('reports a failed save and saves again on retry', async () => {
  saveLinesMock.mockRejectedValueOnce(new Error('offline'));
  await mount();
  await edit({ ...REVIEW, lines: [] });
  await wait(800);
  expect(autosave.status).toBe('failed');

  await act(async () => {
    autosave.retry();
  });

  expect(saveLinesMock).toHaveBeenCalledTimes(2);
  expect(autosave.status).toBe('saved');
});

it('saves what is pending at once when asked to', async () => {
  await mount();
  await edit({ ...REVIEW, lines: [] });

  let saved = false;
  await act(async () => {
    saved = await autosave.flush();
  });

  expect(saved).toBe(true);
  expect(saveLinesMock).toHaveBeenCalledTimes(1);
});

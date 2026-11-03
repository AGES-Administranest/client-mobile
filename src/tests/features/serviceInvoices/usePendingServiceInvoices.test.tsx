import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { PendingServiceInvoice } from 'features/serviceInvoices/domain/offlineServiceInvoices';
import {
  usePendingServiceInvoices,
  type PendingServiceInvoicesState,
} from 'features/serviceInvoices/hooks/usePendingServiceInvoices';
import { notifyOfflineServiceInvoicesChanged } from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { removePendingPdf } from 'features/serviceInvoices/services/pendingPdfStore';

jest.mock('features/serviceInvoices/services/pendingPdfStore', () => ({
  removePendingPdf: jest.fn(),
  savePendingPdf: jest.fn(),
  readPendingPdf: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const removePdf = jest.mocked(removePendingPdf);

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
const OUTBOX_KEY = '@administranest:service-invoices:user-1:outbox';

function note(
  id: string,
  overrides: Partial<PendingServiceInvoice> = {},
): PendingServiceInvoice {
  return {
    id,
    issueDate: '2026-03-15',
    amount: 10,
    clientId: 'client-1',
    file: {
      name: 'a.pdf',
      mimeType: 'application/pdf',
      bytesSize: 1,
      hash: 'h',
    },
    createdAt: '2026-03-16T10:00:00.000Z',
    ...overrides,
  };
}

const seen = {} as { current: PendingServiceInvoicesState };
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

function Probe() {
  seen.current = usePendingServiceInvoices();
  return null;
}

async function mount(signedIn = true) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider
        initialSession={signedIn ? SESSION : null}
        initialAccount={signedIn ? ACCOUNT : null}
      >
        <Probe />
      </AuthProvider>,
    );
  });
  mounted.push(renderer);
  return renderer;
}

async function seed(...notes: PendingServiceInvoice[]) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(notes));
}

async function stored(): Promise<PendingServiceInvoice[]> {
  return JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]');
}

const refused = (code: string, acknowledged: boolean) => ({
  rejection: { code, acknowledged },
});

beforeEach(async () => {
  await AsyncStorage.clear();
  removePdf.mockReset();
});

afterEach(() => {
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
});

describe('usePendingServiceInvoices', () => {
  it('shows nothing without a session or a queue', async () => {
    await mount(false);
    expect(seen.current.counts).toEqual({ waiting: 0, rejected: 0 });

    await mount();
    expect(seen.current.counts).toEqual({ waiting: 0, rejected: 0 });
    expect(seen.current.rejection).toBeNull();
  });

  it('counts what waits apart from what was refused', async () => {
    await seed(note('a'), note('b', refused('X', true)), note('c'));

    await mount();

    expect(seen.current.counts).toEqual({ waiting: 2, rejected: 1 });
  });

  it('puts the first refusal nobody has seen on display, and keeps it when asked', async () => {
    await seed(note('a', refused('X', true)), note('b', refused('Y', false)));
    await mount();

    expect(seen.current.rejection?.id).toBe('b');

    await act(async () => seen.current.keepRejection());

    expect((await stored())[1].rejection?.acknowledged).toBe(true);
    expect(seen.current.rejection).toBeNull();
    expect(seen.current.counts.rejected).toBe(2);
  });

  it('brings a refusal back from the count, even one already seen', async () => {
    await seed(note('a', refused('X', true)));
    await mount();
    expect(seen.current.rejection).toBeNull();

    act(() => seen.current.reopenRejection());

    expect(seen.current.rejection?.id).toBe('a');

    await act(async () => seen.current.keepRejection());

    expect(seen.current.rejection).toBeNull();
    expect((await stored())[0].rejection?.acknowledged).toBe(true);
  });

  it('discards the shown note: out of the queue, PDF off the disk', async () => {
    await seed(note('a', refused('X', false)), note('b'));
    await mount();

    await act(async () => seen.current.discardRejection());

    expect((await stored()).map(item => item.id)).toEqual(['b']);
    expect(removePdf).toHaveBeenCalledWith('user-1', 'a');
    expect(seen.current.counts).toEqual({ waiting: 1, rejected: 0 });
    expect(seen.current.discardLeftFile).toBe(false);
  });

  it('says so when the PDF cannot be deleted, and still drops the note', async () => {
    await seed(note('a', refused('X', false)));
    removePdf.mockImplementation(() => {
      throw new Error('locked');
    });
    await mount();

    await act(async () => seen.current.discardRejection());

    expect(await stored()).toEqual([]);
    expect(seen.current.discardLeftFile).toBe(true);

    act(() => seen.current.dismissDiscardNotice());

    expect(seen.current.discardLeftFile).toBe(false);
  });

  it('warns when the queue cannot be read', async () => {
    await AsyncStorage.setItem(OUTBOX_KEY, '{not json');

    await mount();

    expect(seen.current.loadFailed).toBe(true);
  });

  it('follows the queue when it changes', async () => {
    await mount();
    expect(seen.current.counts.waiting).toBe(0);

    await seed(note('a'));
    await act(async () => notifyOfflineServiceInvoicesChanged());

    expect(seen.current.counts.waiting).toBe(1);
  });
});

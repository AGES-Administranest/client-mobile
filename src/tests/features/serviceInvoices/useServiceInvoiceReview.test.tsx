import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { fetchClients } from 'features/clients/services/clientService';
import type { ServiceInvoiceConfirmation } from 'features/serviceInvoices/domain/serviceInvoice.types';
import {
  useServiceInvoiceReview,
  type ServiceInvoiceReviewState,
} from 'features/serviceInvoices/hooks/useServiceInvoiceReview';
import { queueManualServiceInvoice } from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { confirmServiceInvoice } from 'features/serviceInvoices/services/serviceInvoiceService';

jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  confirmServiceInvoice: jest.fn(),
}));
jest.mock(
  'features/serviceInvoices/services/offlineServiceInvoiceStore',
  () => ({
    queueManualServiceInvoice: jest.fn(),
  }),
);
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const confirmMock = jest.mocked(confirmServiceInvoice);
const fetchClientsMock = jest.mocked(fetchClients);
const queueMock = jest.mocked(queueManualServiceInvoice);

const MANUAL_PDF = {
  uri: 'file:///cache/nota.pdf',
  bytes: new Uint8Array([1]),
  name: 'nota.pdf',
  mimeType: 'application/pdf',
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

const DUPLICATE: ServiceInvoiceConfirmation = {
  duplicateOf: {
    id: 'invoice-0',
    issueDate: '2026-03-15',
    amount: 1850,
    clientName: 'Clínica Vet Sul',
  },
};

const onConfirmed = jest.fn();

function mount({ manual = false }: { manual?: boolean } = {}) {
  const seen = {} as { current: ServiceInvoiceReviewState };

  function Probe() {
    seen.current = useServiceInvoiceReview({
      invoiceId: 'invoice-1',
      initialValues: {
        issueDate: '15/03/2026',
        amount: '1.850,00',
        number: '',
        clientId: 'client-1',
      },
      initialClient: {
        selected: { id: 'client-1', name: 'Clínica Vet Sul', taxId: '' },
        suggestions: [],
      },
      manualFile: manual ? MANUAL_PDF : null,
      onConfirmed,
    });
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
  return { seen, renderer };
}

function pendingConfirmation() {
  let finish: (value: ServiceInvoiceConfirmation) => void = () => {};
  confirmMock.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  return (value: ServiceInvoiceConfirmation) => finish(value);
}

beforeEach(() => {
  jest.resetAllMocks();
  fetchClientsMock.mockResolvedValue([]);
});

describe('useServiceInvoiceReview, leaving during a confirmation', () => {
  it('reports the confirmed note while the screen is there', async () => {
    confirmMock.mockResolvedValue({ id: 'invoice-1' });
    const { seen } = mount();

    await act(async () => {
      await seen.current.submit();
    });

    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not report the note when the screen was left during the confirmation', async () => {
    const finish = pendingConfirmation();
    const { seen, renderer } = mount();

    let pending!: Promise<void>;
    act(() => {
      pending = seen.current.submit();
    });
    act(() => renderer.unmount());
    await act(async () => {
      finish({ id: 'invoice-1' });
      await pending;
    });

    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('does not report "Salvar mesmo assim" when the screen was left during it', async () => {
    confirmMock.mockResolvedValueOnce(DUPLICATE);
    const { seen, renderer } = mount();
    await act(async () => {
      await seen.current.submit();
    });
    expect(seen.current.duplicate?.isOpen).toBe(true);

    const finish = pendingConfirmation();
    let pending!: Promise<void>;
    act(() => {
      pending = seen.current.saveDuplicateAnyway();
    });
    act(() => renderer.unmount());
    await act(async () => {
      finish({ id: 'invoice-1' });
      await pending;
    });

    expect(confirmMock).toHaveBeenLastCalledWith(
      'id-token',
      'invoice-1',
      expect.anything(),
      { allowDuplicate: true },
    );
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});

describe('useServiceInvoiceReview, a note typed by hand', () => {
  it('queues the note on the device instead of confirming it', async () => {
    queueMock.mockResolvedValue({ id: 'saved-1' } as Awaited<
      ReturnType<typeof queueManualServiceInvoice>
    >);
    const { seen } = mount({ manual: true });

    await act(async () => {
      await seen.current.submit();
    });

    expect(queueMock).toHaveBeenCalledWith(
      'user-1',
      'invoice-1',
      expect.objectContaining({ amount: 1850, clientId: 'client-1' }),
      MANUAL_PDF,
    );
    expect(confirmMock).not.toHaveBeenCalled();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('shows the failure and keeps the review when it cannot be saved', async () => {
    queueMock.mockRejectedValue(new Error('disk full'));
    const { seen } = mount({ manual: true });

    await act(async () => {
      await seen.current.submit();
    });

    expect(seen.current.submitFailed).toBe(true);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('does not report the note when the screen was left while it was saved', async () => {
    let finish: (value: { id: string }) => void = () => {};
    queueMock.mockReturnValue(
      new Promise(resolve => {
        finish = resolve as typeof finish;
      }),
    );
    const { seen, renderer } = mount({ manual: true });

    let pending!: Promise<void>;
    act(() => {
      pending = seen.current.submit();
    });
    act(() => renderer.unmount());
    await act(async () => {
      finish({ id: 'saved-1' });
      await pending;
    });

    expect(onConfirmed).not.toHaveBeenCalled();
  });
});

import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ActionButton } from 'app/components/ui';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { LoadingOverlay } from 'app/components/ui/loading-overlay';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Client } from 'features/clients/domain/client';
import { fetchClients } from 'features/clients/services/clientService';
import { NewClinicSheet } from 'features/clinics';
import { createClient } from 'features/clinics/services/clientService';
import {
  ServiceInvoiceUploadFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import {
  confirmServiceInvoice,
  discardServiceInvoiceDraft,
  extractServiceInvoice,
} from 'features/serviceInvoices/services/serviceInvoiceService';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { pickPdf } from 'shared/services/pdfPicker';

jest.mock('shared/services/pdfPicker', () => ({ pickPdf: jest.fn() }));
jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  newServiceInvoiceId: jest.fn(() => 'invoice-1'),
  extractServiceInvoice: jest.fn(),
  confirmServiceInvoice: jest.fn(),
  discardServiceInvoiceDraft: jest.fn(async () => undefined),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
}));
jest.mock('features/clinics/services/clientService', () => ({
  createClient: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const pickPdfMock = pickPdf as jest.MockedFunction<typeof pickPdf>;
const extractMock = extractServiceInvoice as jest.MockedFunction<
  typeof extractServiceInvoice
>;
const confirmMock = confirmServiceInvoice as jest.MockedFunction<
  typeof confirmServiceInvoice
>;
const discardMock = jest.mocked(discardServiceInvoiceDraft);
const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;
const fetchClientsMock = fetchClients as jest.MockedFunction<
  typeof fetchClients
>;

// Finance starts the upload from its "Novo lançamento" sheet; here a button
// stands in for it, idle again only when the flow is.
function Harness({ onInvoiceConfirmed }: { onInvoiceConfirmed?: () => void }) {
  const upload = useServiceInvoiceUpload();
  return (
    <>
      <ActionButton
        label="Enviar nota fiscal"
        disabled={upload.step !== 'idle'}
        onPress={upload.start}
      />
      <ServiceInvoiceUploadFlow
        upload={upload}
        onInvoiceConfirmed={onInvoiceConfirmed}
      />
    </>
  );
}

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

function pdf(name: string) {
  return {
    uri: 'file:///cache/nota.pdf',
    bytes: new Uint8Array([1, 2, 3]),
    name,
    mimeType: 'application/pdf' as const,
  };
}

const CLINIC: Client = {
  id: 'client-1',
  type: 'CLINIC',
  name: 'Clínica Vet Sul',
  taxId: null,
  taxIdType: null,
  contactName: null,
  email: null,
  phone: null,
  addressLine: null,
  city: null,
  state: null,
  serviceDays: [],
  paymentTermsDays: null,
  preferredPaymentMethod: null,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  pickPdfMock.mockReset();
  extractMock.mockReset();
  confirmMock.mockReset();
  discardMock.mockClear();
  fetchClientsMock.mockReset();
  fetchClientsMock.mockResolvedValue([CLINIC]);
  createClientMock.mockReset();
  confirmMock.mockResolvedValue({ id: 'invoice-1' });
});

async function renderFlow(onInvoiceConfirmed?: () => void) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <Harness onInvoiceConfirmed={onInvoiceConfirmed} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  return renderer!;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

function field(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props?.accessibilityLabel === label &&
      typeof node.props?.value === 'string',
  );
}

function press(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  const targets = renderer.root.findAll(
    node =>
      typeof node.props?.onPress === 'function' &&
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props?.children === label,
      ).length > 0,
  );
  const target = targets[targets.length - 1];
  return act(async () => {
    await target.props.onPress();
  });
}

function type(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  text: string,
) {
  return act(async () => {
    field(renderer, label).props.onChangeText(text);
  });
}

function back(renderer: ReactTestRenderer.ReactTestRenderer) {
  return act(async () => {
    renderer.root
      .find(node => node.props?.accessibilityLabel === 'Voltar')
      .props.onPress();
  });
}

function focus(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return act(async () => {
    field(renderer, label).props.onFocus();
  });
}

async function startWith(
  renderer: ReactTestRenderer.ReactTestRenderer,
  fileName: string,
) {
  pickPdfMock.mockResolvedValue(pdf(fileName));
  await press(renderer, 'Enviar nota fiscal');
}

describe('file selection', () => {
  it('refuses a file that is not a PDF and does not read it', async () => {
    const renderer = await renderFlow();

    await startWith(renderer, 'foto.jpg');

    expect(texts(renderer)).toContain(
      'Só aceitamos notas em PDF. Escolha um arquivo .pdf.',
    );
    expect(extractMock).not.toHaveBeenCalled();
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('refuses a file named .pdf whose declared type is not a PDF', async () => {
    const renderer = await renderFlow();
    pickPdfMock.mockResolvedValue({
      ...pdf('nota.pdf'),
      mimeType: 'image/png',
    });

    await press(renderer, 'Enviar nota fiscal');

    expect(texts(renderer)).toContain(
      'Só aceitamos notas em PDF. Escolha um arquivo .pdf.',
    );
    expect(extractMock).not.toHaveBeenCalled();
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('asks the picker for a PDF only', async () => {
    const renderer = await renderFlow();
    extractMock.mockResolvedValue({ status: 'SUCCESS' });

    await startWith(renderer, 'nota.pdf');

    expect(pickPdfMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the picker is cancelled', async () => {
    const renderer = await renderFlow();
    pickPdfMock.mockResolvedValue(null);

    await press(renderer, 'Enviar nota fiscal');

    expect(extractMock).not.toHaveBeenCalled();
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('closes the refusal message and lets the person try again', async () => {
    const renderer = await renderFlow();
    await startWith(renderer, 'foto.jpg');

    await press(renderer, 'Entendi');
    extractMock.mockResolvedValue({ status: 'SUCCESS' });
    await startWith(renderer, 'nota.pdf');

    expect(texts(renderer)).toContain('Revisar nota fiscal');
  });
});

function trigger(renderer: ReactTestRenderer.ReactTestRenderer) {
  const nodes = renderer.root.findAll(
    node =>
      typeof node.props?.onPress === 'function' &&
      node.findAll(
        child =>
          typeof child.type === 'string' &&
          child.props?.children === 'Enviar nota fiscal',
      ).length > 0,
  );
  return nodes[nodes.length - 1];
}

describe('trigger button', () => {
  it('is enabled again after the picker is cancelled', async () => {
    const renderer = await renderFlow();
    pickPdfMock.mockResolvedValue(null);

    await press(renderer, 'Enviar nota fiscal');

    expect(trigger(renderer).props.disabled).toBeFalsy();
  });

  it('is enabled again after the picker breaks', async () => {
    const renderer = await renderFlow();
    pickPdfMock.mockRejectedValue(new Error('picker'));

    await press(renderer, 'Enviar nota fiscal');

    expect(trigger(renderer).props.disabled).toBeFalsy();
    pickPdfMock.mockResolvedValue(null);
    await press(renderer, 'Enviar nota fiscal');
    expect(pickPdfMock).toHaveBeenCalledTimes(2);
  });

  it('opens the picker once when tapped twice before it answers', async () => {
    let answer: (value: null) => void = () => {};
    pickPdfMock.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const renderer = await renderFlow();
    const button = trigger(renderer);

    await act(async () => {
      button.props.onPress();
      button.props.onPress();
    });
    expect(pickPdfMock).toHaveBeenCalledTimes(1);
    expect(trigger(renderer).props.disabled).toBe(true);

    await act(async () => {
      answer(null);
    });
    expect(trigger(renderer).props.disabled).toBeFalsy();
  });
});

describe('reading', () => {
  it('shows the loading overlay while the PDF is being read', async () => {
    let finish: (value: { status: 'FAILED' }) => void = () => {};
    extractMock.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const renderer = await renderFlow();

    pickPdfMock.mockResolvedValue(pdf('nota.pdf'));
    await act(async () => {
      trigger(renderer).props.onPress();
    });
    expect(renderer.root.findByType(LoadingOverlay).props.visible).toBe(true);
    expect(renderer.root.findByType(LoadingOverlay).props.label).toBe(
      'Lendo a nota…',
    );

    await act(async () => {
      finish({ status: 'FAILED' });
    });
    expect(renderer.root.findByType(LoadingOverlay).props.visible).toBe(false);
  });

  it('opens the review with the fields filled in and editable', async () => {
    extractMock.mockResolvedValue({
      status: 'SUCCESS',
      issueDate: '2026-03-15',
      amount: 1850,
      number: '2026/0042',
    });
    const renderer = await renderFlow();

    await startWith(renderer, 'nota.pdf');

    expect(extractMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ name: 'nota.pdf' }),
    );
    expect(field(renderer, 'Data de emissão').props.value).toBe('15/03/2026');
    expect(field(renderer, 'Valor total').props.value).toBe('1.850,00');
    expect(field(renderer, 'Número da nota').props.value).toBe('2026/0042');
    expect(field(renderer, 'Valor total').props.editable).toBe(true);
    expect(texts(renderer)).not.toContain('Não conseguimos ler a nota');

    await type(renderer, 'Valor total', '200000');
    expect(field(renderer, 'Valor total').props.value).toBe('2.000,00');
  });

  it('fills only what a partial reading found', async () => {
    extractMock.mockResolvedValue({
      status: 'PARTIAL',
      issueDate: '2026-03-15',
    });
    const renderer = await renderFlow();

    await startWith(renderer, 'nota-parcial.pdf');

    expect(field(renderer, 'Data de emissão').props.value).toBe('15/03/2026');
    expect(field(renderer, 'Valor total').props.value).toBe('');
  });

  it('on a failed reading, warns kindly and leaves the fields empty', async () => {
    extractMock.mockResolvedValue({ status: 'FAILED' });
    const renderer = await renderFlow();

    await startWith(renderer, 'nota-falha.pdf');

    expect(texts(renderer)).toContain(
      'Não conseguimos ler a nota. Preencha os dados manualmente.',
    );
    expect(field(renderer, 'Data de emissão').props.value).toBe('');
    expect(field(renderer, 'Valor total').props.value).toBe('');
    expect(field(renderer, 'Número da nota').props.value).toBe('');
    expect(field(renderer, 'Data de emissão').props.editable).toBe(true);
  });

  it('saves a note it could not send on the device, under the same id', async () => {
    extractMock.mockRejectedValue(new TypeError('Network request failed'));
    const renderer = await renderFlow();

    await startWith(renderer, 'nota.pdf');

    expect(texts(renderer)).toContain(
      'Cadastro manual: a nota e o PDF nota.pdf ficam salvos neste aparelho e são enviados quando houver conexão.',
    );
    expect(field(renderer, 'Valor total').props.value).toBe('');
    expect(texts(renderer)).toContain('Salvar nota');
  });
});

describe('a file the backend refuses', () => {
  it.each([
    ['SERVICE_INVOICE_FILE_DUPLICATED', 'Este PDF já foi enviado antes.'],
    [
      'SERVICE_INVOICE_FILE_TOO_LARGE',
      'O PDF passa de 15 MB, o limite aceito. Escolha outro arquivo.',
    ],
  ])('says why on a %s, without opening the review', async (code, message) => {
    extractMock.mockRejectedValue(new ApiError('no', code, 409));
    const renderer = await renderFlow();

    await startWith(renderer, 'nota.pdf');

    expect(texts(renderer)).toContain(message);
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('refuses a PDF over 15 MB before sending it', async () => {
    const renderer = await renderFlow();
    pickPdfMock.mockResolvedValue({
      ...pdf('nota.pdf'),
      bytes: new Uint8Array(15 * 1024 * 1024 + 1),
    });

    await press(renderer, 'Enviar nota fiscal');

    expect(texts(renderer)).toContain(
      'O PDF passa de 15 MB, o limite aceito. Escolha outro arquivo.',
    );
    expect(extractMock).not.toHaveBeenCalled();
  });
});

describe('review', () => {
  async function openEmptyReview() {
    extractMock.mockResolvedValue({ status: 'FAILED' });
    const renderer = await renderFlow();
    await startWith(renderer, 'nota-falha.pdf');
    return renderer;
  }

  it('shows the inline errors for the required fields and does not confirm', async () => {
    const renderer = await openEmptyReview();

    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain('Informe a data de emissão.');
    expect(texts(renderer)).toContain('Informe o valor total.');
    expect(texts(renderer)).toContain('Escolha o tomador da nota.');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('flags an invalid date and a zero amount', async () => {
    const renderer = await openEmptyReview();
    await type(renderer, 'Data de emissão', '31022026');
    await type(renderer, 'Valor total', '0');

    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain(
      'Data inválida. Use o formato DD/MM/AAAA.',
    );
    expect(texts(renderer)).toContain('O valor precisa ser maior que zero.');
  });

  it('clears a field error as soon as the field is edited', async () => {
    const renderer = await openEmptyReview();
    await press(renderer, 'Confirmar');
    expect(texts(renderer)).toContain('Informe o valor total.');

    await type(renderer, 'Valor total', '1000');

    expect(texts(renderer)).not.toContain('Informe o valor total.');
  });

  it('confirms the typed note with the chosen client and closes the review', async () => {
    const renderer = await openEmptyReview();
    await type(renderer, 'Data de emissão', '15032026');
    await type(renderer, 'Valor total', '185000');
    await type(renderer, 'Tomador', 'Clínica');
    await focus(renderer, 'Tomador');
    await press(renderer, 'Clínica Vet Sul');

    await press(renderer, 'Confirmar');

    expect(confirmMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      { issueDate: '2026-03-15', amount: 1850, clientId: 'client-1' },
      { allowDuplicate: false },
    );
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('keeps the review open with a message when the confirmation fails', async () => {
    confirmMock.mockRejectedValue(new Error('network'));
    const renderer = await openEmptyReview();
    await type(renderer, 'Data de emissão', '15032026');
    await type(renderer, 'Valor total', '185000');
    await type(renderer, 'Tomador', 'Clínica');
    await focus(renderer, 'Tomador');
    await press(renderer, 'Clínica Vet Sul');

    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain(
      'Não foi possível confirmar a nota. Tente novamente.',
    );
    expect(field(renderer, 'Valor total').props.value).toBe('1.850,00');
  });

  it('typing again in the client field undoes the choice', async () => {
    const renderer = await openEmptyReview();
    await type(renderer, 'Data de emissão', '15032026');
    await type(renderer, 'Valor total', '185000');
    await type(renderer, 'Tomador', 'Clínica');
    await focus(renderer, 'Tomador');
    await press(renderer, 'Clínica Vet Sul');

    await type(renderer, 'Tomador', 'Outra');
    await press(renderer, 'Confirmar');

    expect(confirmMock).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain('Escolha o tomador da nota.');
  });

  it('goes back at once when nothing was edited', async () => {
    const renderer = await openEmptyReview();

    await back(renderer);

    expect(texts(renderer)).not.toContain('Sair da nota?');
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('asks before leaving with edits, and cancelling keeps the data', async () => {
    const renderer = await openEmptyReview();
    await type(renderer, 'Valor total', '185000');

    await back(renderer);
    expect(texts(renderer)).toContain('Sair da nota?');

    await press(renderer, 'Continuar preenchendo');
    expect(texts(renderer)).toContain('Revisar nota fiscal');
    expect(field(renderer, 'Valor total').props.value).toBe('1.850,00');
  });

  it('leaves and discards the data when the person confirms', async () => {
    const renderer = await openEmptyReview();
    await type(renderer, 'Valor total', '185000');

    await back(renderer);
    await press(renderer, 'Sair sem salvar');

    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('discards the draft on the way out, so the same PDF can be sent again', async () => {
    const renderer = await openEmptyReview();

    await back(renderer);

    expect(discardMock).toHaveBeenCalledWith('id-token', 'invoice-1');
  });

  it('keeps the confirmed note and tells the screen behind', async () => {
    const onInvoiceConfirmed = jest.fn();
    const renderer = await renderFlow(onInvoiceConfirmed);
    extractMock.mockResolvedValue({ status: 'FAILED' });
    await startWith(renderer, 'nota.pdf');
    await type(renderer, 'Data de emissão', '15032026');
    await type(renderer, 'Valor total', '185000');
    await type(renderer, 'Tomador', 'Clínica');
    await focus(renderer, 'Tomador');
    await press(renderer, 'Clínica Vet Sul');

    await press(renderer, 'Confirmar');

    expect(onInvoiceConfirmed).toHaveBeenCalledTimes(1);
    expect(discardMock).not.toHaveBeenCalled();
  });
});

const FULL_READING = {
  status: 'SUCCESS' as const,
  issueDate: '2026-03-15',
  amount: 1850,
  number: '2026/0042',
  taker: { name: 'Clínica Nova', taxId: '11222333000181' },
};

const LINKED = {
  id: 'client-1',
  name: 'Clínica Vet Sul',
  taxId: '11222333000181',
};

async function openWith(
  extraction: Parameters<typeof extractMock.mockResolvedValue>[0],
) {
  extractMock.mockResolvedValue(extraction);
  const renderer = await renderFlow();
  await startWith(renderer, 'nota.pdf');
  return renderer;
}

describe('taker linked by the reading', () => {
  it('opens with the linked taker selected and confirms it untouched', async () => {
    const renderer = await openWith({ ...FULL_READING, clientMatch: LINKED });

    expect(field(renderer, 'Tomador').props.value).toBe('Clínica Vet Sul');

    await press(renderer, 'Confirmar');

    expect(confirmMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ clientId: 'client-1' }),
      { allowDuplicate: false },
    );
  });

  it('goes back at once when only the linked taker is there', async () => {
    const renderer = await openWith({ ...FULL_READING, clientMatch: LINKED });

    await back(renderer);

    expect(texts(renderer)).not.toContain('Sair da nota?');
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('lets the person swap the linked taker', async () => {
    fetchClientsMock.mockResolvedValue([
      CLINIC,
      { ...CLINIC, id: 'client-2', name: 'Pet Norte' },
    ]);
    const renderer = await openWith({ ...FULL_READING, clientMatch: LINKED });

    await type(renderer, 'Tomador', 'Pet');
    await focus(renderer, 'Tomador');
    await press(renderer, 'Pet Norte');
    await press(renderer, 'Confirmar');

    expect(confirmMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ clientId: 'client-2' }),
      { allowDuplicate: false },
    );
  });

  it('counts swapping the linked taker as an edit', async () => {
    const renderer = await openWith({ ...FULL_READING, clientMatch: LINKED });

    await type(renderer, 'Tomador', 'Outra');
    await back(renderer);

    expect(texts(renderer)).toContain('Sair da nota?');
  });
});

describe('taker search', () => {
  it('says so when the taker list cannot be loaded', async () => {
    fetchClientsMock.mockRejectedValue(new Error('offline'));
    const renderer = await openWith(FULL_READING);

    await type(renderer, 'Tomador', 'Clín');
    await focus(renderer, 'Tomador');

    expect(texts(renderer)).toContain('Não foi possível buscar os tomadores.');
  });
});

describe('suggested takers', () => {
  const SUGGESTIONS = [
    LINKED,
    { id: 'client-2', name: 'Pet Norte', taxId: '22333444000155' },
  ];

  it('lists the suggestions and selects one with a tap', async () => {
    const renderer = await openWith({
      ...FULL_READING,
      clientSuggestions: SUGGESTIONS,
    });

    expect(field(renderer, 'Tomador').props.value).toBe('');
    expect(texts(renderer)).toContain('Sugestões de tomador');

    await press(renderer, 'Pet Norte');

    expect(field(renderer, 'Tomador').props.value).toBe('Pet Norte');
    expect(texts(renderer)).not.toContain('Sugestões de tomador');
    await press(renderer, 'Confirmar');
    expect(confirmMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ clientId: 'client-2' }),
      { allowDuplicate: false },
    );
  });

  it('keeps the free search available and counts the pick as an edit', async () => {
    const renderer = await openWith({
      ...FULL_READING,
      clientSuggestions: SUGGESTIONS,
    });

    await press(renderer, 'Pet Norte');
    await back(renderer);

    expect(texts(renderer)).toContain('Sair da nota?');
  });
});

describe('registering a new taker', () => {
  const NEW_CLIENT: Client = {
    ...CLINIC,
    id: 'client-new',
    name: 'Clínica Nova',
    taxId: '11222333000181',
    taxIdType: 'CNPJ',
  };

  function reviewModal(renderer: ReactTestRenderer.ReactTestRenderer) {
    return renderer.root.findByType(FullScreenModal);
  }

  function registerSheet(renderer: ReactTestRenderer.ReactTestRenderer) {
    return renderer.root.findByType(NewClinicSheet);
  }

  function leaveReview(renderer: ReactTestRenderer.ReactTestRenderer) {
    return act(async () => {
      reviewModal(renderer).props.onDismiss();
    });
  }

  function leaveRegister(renderer: ReactTestRenderer.ReactTestRenderer) {
    return act(async () => {
      registerSheet(renderer).props.onClosed();
    });
  }

  function hasField(
    renderer: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ) {
    return (
      renderer.root.findAll(node => node.props?.accessibilityLabel === label)
        .length > 0
    );
  }

  async function openRegister(renderer: ReactTestRenderer.ReactTestRenderer) {
    await press(renderer, 'Cadastrar novo tomador');
    await leaveReview(renderer);
  }

  async function fillRest(renderer: ReactTestRenderer.ReactTestRenderer) {
    await type(renderer, 'Endereço', 'Rua das Hortênsias, 340');
    await type(renderer, 'Cidade', 'Campinas');
    await type(renderer, 'UF', 'SP');
    await type(renderer, 'Contato', '1134567890');
    await type(renderer, 'E-mail', 'contato@vetnova.com.br');
    await type(renderer, 'Responsável', 'Dr. André Matos');
  }

  it('does not stack the registration over the review', async () => {
    const renderer = await openWith(FULL_READING);

    await press(renderer, 'Cadastrar novo tomador');

    expect(reviewModal(renderer).props.visible).toBe(false);
    expect(registerSheet(renderer).props.visible).toBe(false);

    await leaveReview(renderer);

    expect(registerSheet(renderer).props.visible).toBe(true);
  });

  it('opens filled with the name and CNPJ read from the note', async () => {
    const renderer = await openWith(FULL_READING);

    await openRegister(renderer);

    expect(field(renderer, 'Nome da clínica').props.value).toBe('Clínica Nova');
    expect(field(renderer, 'CNPJ').props.value).toBe('11.222.333/0001-81');
  });

  it('opens with the fields the note lacked left empty', async () => {
    const renderer = await openWith({ status: 'PARTIAL' });

    await openRegister(renderer);

    expect(field(renderer, 'Nome da clínica').props.value).toBe('');
    expect(field(renderer, 'CNPJ').props.value).toBe('');
  });

  it('on save, reopens the review with what was typed and the new taker', async () => {
    createClientMock.mockResolvedValue(NEW_CLIENT);
    const renderer = await openWith(FULL_READING);
    await type(renderer, 'Valor total', '200000');
    await type(renderer, 'Número da nota', '77');

    await openRegister(renderer);
    expect(hasField(renderer, 'Valor total')).toBe(false);
    await fillRest(renderer);
    await press(renderer, 'Confirmar');
    await leaveRegister(renderer);

    expect(reviewModal(renderer).props.visible).toBe(true);
    expect(registerSheet(renderer).props.visible).toBe(false);
    expect(field(renderer, 'Valor total').props.value).toBe('2.000,00');
    expect(field(renderer, 'Número da nota').props.value).toBe('77');
    expect(field(renderer, 'Data de emissão').props.value).toBe('15/03/2026');
    expect(field(renderer, 'Tomador').props.value).toBe('Clínica Nova');

    await press(renderer, 'Confirmar');
    expect(confirmMock).toHaveBeenCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ clientId: 'client-new', amount: 2000 }),
      { allowDuplicate: false },
    );
  });

  it('counts the new taker as an edit', async () => {
    createClientMock.mockResolvedValue(NEW_CLIENT);
    const renderer = await openWith(FULL_READING);
    await openRegister(renderer);
    await fillRest(renderer);
    await press(renderer, 'Confirmar');
    await leaveRegister(renderer);

    await back(renderer);

    expect(texts(renderer)).toContain('Sair da nota?');
  });

  it('keeps the suggestions and the errors while the review is hidden', async () => {
    const renderer = await openWith({
      ...FULL_READING,
      amount: undefined,
      clientSuggestions: [LINKED],
    });
    await press(renderer, 'Confirmar');

    await openRegister(renderer);
    await act(async () => {
      registerSheet(renderer).props.onClose();
    });
    await leaveRegister(renderer);

    expect(texts(renderer)).toContain('Informe o valor total.');
    expect(texts(renderer)).toContain('Sugestões de tomador');
  });

  it('on cancel, reopens the review exactly as it was', async () => {
    const renderer = await openWith(FULL_READING);
    await type(renderer, 'Valor total', '200000');
    await type(renderer, 'Tomador', 'Clín');

    await openRegister(renderer);
    expect(hasField(renderer, 'Valor total')).toBe(false);
    expect(hasField(renderer, 'Tomador')).toBe(false);
    await act(async () => {
      registerSheet(renderer).props.onClose();
    });
    await leaveRegister(renderer);

    expect(createClientMock).not.toHaveBeenCalled();
    expect(reviewModal(renderer).props.visible).toBe(true);
    expect(field(renderer, 'Valor total').props.value).toBe('2.000,00');
    expect(field(renderer, 'Tomador').props.value).toBe('Clín');
  });

  it('keeps the review as it was after a cancel with nothing edited', async () => {
    const renderer = await openWith(FULL_READING);
    await openRegister(renderer);
    await act(async () => {
      registerSheet(renderer).props.onClose();
    });
    await leaveRegister(renderer);

    await back(renderer);

    expect(texts(renderer)).not.toContain('Sair da nota?');
  });

  it('keeps the registration open with the draft when saving fails', async () => {
    createClientMock.mockRejectedValue(new Error('boom'));
    const renderer = await openWith(FULL_READING);
    await openRegister(renderer);
    await fillRest(renderer);

    await press(renderer, 'Confirmar');

    expect(registerSheet(renderer).props.visible).toBe(true);
    expect(texts(renderer)).toContain(
      'Não foi possível salvar a clínica. Tente novamente.',
    );
    expect(field(renderer, 'Nome da clínica').props.value).toBe('Clínica Nova');
  });

  it('refuses a taker still queued offline instead of sending its local id', async () => {
    createClientMock.mockResolvedValue({
      ...NEW_CLIENT,
      id: 'local:abc',
    });
    const renderer = await openWith(FULL_READING);
    await openRegister(renderer);
    await fillRest(renderer);
    await press(renderer, 'Confirmar');
    await leaveRegister(renderer);

    await press(renderer, 'Confirmar');

    expect(confirmMock).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain(
      'Esse tomador ainda aguarda sincronização. Confirme a nota quando houver conexão.',
    );
  });
});

describe('duplicate note', () => {
  const DUPLICATE = {
    id: 'invoice-0',
    number: '2026/0031',
    issueDate: '2026-03-15',
    amount: 1850,
    clientName: 'Clínica Vet Sul',
  };

  async function confirmDuplicate() {
    confirmMock.mockResolvedValueOnce({ duplicateOf: DUPLICATE });
    const renderer = await openWith({ ...FULL_READING, clientMatch: LINKED });
    await press(renderer, 'Confirmar');
    return renderer;
  }

  it('warns with the data of the similar note', async () => {
    const renderer = await confirmDuplicate();

    const shown = texts(renderer);
    expect(shown).toContain('Nota parecida encontrada');
    expect(shown).toContain('2026/0031');
    expect(shown).toContain('15/03/2026');
    expect(shown.replace(/\s/g, ' ')).toContain('R$ 1.850,00');
    expect(shown).toContain('Clínica Vet Sul');
    expect(texts(renderer)).toContain('Revisar nota fiscal');
  });

  it('saves anyway by confirming again with the duplicate allowed', async () => {
    const renderer = await confirmDuplicate();
    confirmMock.mockResolvedValueOnce({ id: 'invoice-1' });

    await press(renderer, 'Salvar mesmo assim');

    expect(confirmMock).toHaveBeenLastCalledWith(
      'id-token',
      'invoice-1',
      expect.objectContaining({ clientId: 'client-1' }),
      { allowDuplicate: true },
    );
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('sends "Salvar mesmo assim" once when tapped twice', async () => {
    const renderer = await confirmDuplicate();
    let finish: (value: { id: string }) => void = () => {};
    confirmMock.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const button = renderer.root.findAll(
      node =>
        typeof node.props?.onPress === 'function' &&
        node.findAll(
          child =>
            typeof child.type === 'string' &&
            child.props?.children === 'Salvar mesmo assim',
        ).length > 0,
    );
    const save = button[button.length - 1];

    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });

    expect(confirmMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish({ id: 'invoice-1' });
    });
  });

  it('cancels the warning and keeps the review as it was', async () => {
    const renderer = await confirmDuplicate();

    await press(renderer, 'Cancelar');

    expect(texts(renderer)).not.toContain('Nota parecida encontrada');
    expect(texts(renderer)).toContain('Revisar nota fiscal');
    expect(field(renderer, 'Valor total').props.value).toBe('1.850,00');
    expect(field(renderer, 'Tomador').props.value).toBe('Clínica Vet Sul');
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('shows the existing note read-only and goes back to the warning', async () => {
    const renderer = await confirmDuplicate();

    await press(renderer, 'Ver nota existente');

    expect(texts(renderer)).toContain('Nota já registrada');
    expect(texts(renderer)).toContain('2026/0031');
    expect(confirmMock).toHaveBeenCalledTimes(1);

    await press(renderer, 'Voltar ao aviso');

    expect(texts(renderer)).toContain('Nota parecida encontrada');
  });
});

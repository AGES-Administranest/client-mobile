import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { FullScreenModal as FullScreenModalType } from 'app/components/ui/full-screen-modal';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Client } from 'features/clients/domain/client';
import { fetchClients } from 'features/clients/services/clientService';
import { NewClinicSheet as NewClinicSheetType } from 'features/clinics';
import { createClient } from 'features/clinics/services/clientService';
import { ServiceInvoiceUploadFlow } from 'features/serviceInvoices';
import { OfflineNoticeSheet } from 'features/serviceInvoices/components/OfflineNoticeSheet';
import type { PendingServiceInvoice } from 'features/serviceInvoices/domain/offlineServiceInvoices';
import {
  readPendingPdf,
  removePendingPdf,
  savePendingPdf,
} from 'features/serviceInvoices/services/pendingPdfStore';
import {
  confirmServiceInvoice,
  extractServiceInvoice,
} from 'features/serviceInvoices/services/serviceInvoiceService';
import { I18nProvider } from 'shared/i18n';
import { isOnline, onConnectionRestored } from 'shared/services/network';
import { pickPdf } from 'shared/services/pdfPicker';

jest.mock('shared/services/pdfPicker', () => ({ pickPdf: jest.fn() }));
jest.mock('shared/services/network', () => ({
  isOnline: jest.fn(),
  onConnectionRestored: jest.fn(() => () => undefined),
}));
jest.mock('features/serviceInvoices/services/pendingPdfStore', () => ({
  savePendingPdf: jest.fn(),
  readPendingPdf: jest.fn(),
  removePendingPdf: jest.fn(),
}));
jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  extractServiceInvoice: jest.fn(),
  confirmServiceInvoice: jest.fn(),
  requestServiceInvoiceUpload: jest.fn(),
  sendServiceInvoicePdf: jest.fn(),
  syncServiceInvoices: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
}));
jest.mock('features/clinics/services/clientService', () => ({
  createClient: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'app-generated-id'),
  digest: jest.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const isOnlineMock = jest.mocked(isOnline);
const pickPdfMock = jest.mocked(pickPdf);
const extractMock = jest.mocked(extractServiceInvoice);
const confirmMock = jest.mocked(confirmServiceInvoice);
const fetchClientsMock = jest.mocked(fetchClients);
const createClientMock = jest.mocked(createClient);
const connectionMock = jest.mocked(onConnectionRestored);
const removePdfMock = jest.mocked(removePendingPdf);
const readPdfMock = jest.mocked(readPendingPdf);
const savePdfMock = jest.mocked(savePendingPdf);

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
const OUTBOX_KEY = '@administranest:service-invoices:user-1:outbox';

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

const PDF = {
  uri: 'file:///cache/nota.pdf',
  bytes: new Uint8Array([1, 2, 3]),
  name: 'nota.pdf',
  mimeType: 'application/pdf',
};

function pendingNote(
  id: string,
  overrides: Partial<PendingServiceInvoice> = {},
): PendingServiceInvoice {
  return {
    id,
    issueDate: '2026-03-15',
    amount: 1850,
    clientId: 'client-1',
    file: {
      name: `${id}.pdf`,
      mimeType: 'application/pdf',
      bytesSize: 3,
      hash: 'a'.repeat(64),
    },
    createdAt: '2026-03-16T10:00:00.000Z',
    ...overrides,
  };
}

async function seedOutbox(...notes: PendingServiceInvoice[]) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(notes));
}

async function storedOutbox(): Promise<PendingServiceInvoice[]> {
  return JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]');
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
});

beforeEach(async () => {
  await AsyncStorage.clear();
  [
    isOnlineMock,
    pickPdfMock,
    extractMock,
    confirmMock,
    fetchClientsMock,
    createClientMock,
    readPdfMock,
    savePdfMock,
    removePdfMock,
    connectionMock,
  ].forEach(mock => mock.mockReset());
  isOnlineMock.mockResolvedValue(false);
  fetchClientsMock.mockResolvedValue([CLINIC]);
  readPdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

async function renderFlow() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <ServiceInvoiceUploadFlow />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(renderer);
  return renderer;
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

function focus(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return act(async () => {
    field(renderer, label).props.onFocus();
  });
}

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

function noticeLeft(renderer: ReactTestRenderer.ReactTestRenderer) {
  return act(async () => {
    renderer.root.findByType(OfflineNoticeSheet).props.onClosed();
  });
}

async function openManualReview(renderer: ReactTestRenderer.ReactTestRenderer) {
  pickPdfMock.mockResolvedValue(PDF);
  await press(renderer, 'Enviar nota fiscal');
  await press(renderer, 'Cadastrar manualmente');
  await noticeLeft(renderer);
}

async function fillManualNote(renderer: ReactTestRenderer.ReactTestRenderer) {
  await type(renderer, 'Data de emissão', '15032026');
  await type(renderer, 'Valor total', '185000');
  await type(renderer, 'Número da nota', '2026/0042');
  await type(renderer, 'Tomador', 'Clínica');
  await focus(renderer, 'Tomador');
  await press(renderer, 'Clínica Vet Sul');
}

describe('opening the upload without a connection', () => {
  it('warns that the automatic reading needs a connection and offers the manual entry', async () => {
    const renderer = await renderFlow();

    await press(renderer, 'Enviar nota fiscal');

    const shown = texts(renderer);
    expect(shown).toContain('Sem conexão');
    expect(shown).toContain('não consegue ler a nota automaticamente');
    expect(shown).toContain('Cadastrar manualmente');
    expect(pickPdfMock).not.toHaveBeenCalled();
    expect(extractMock).not.toHaveBeenCalled();
  });

  it('does not offer it when there is a connection', async () => {
    isOnlineMock.mockResolvedValue(true);
    pickPdfMock.mockResolvedValue(null);
    const renderer = await renderFlow();

    await press(renderer, 'Enviar nota fiscal');

    expect(texts(renderer)).not.toContain('Cadastrar manualmente');
    expect(pickPdfMock).toHaveBeenCalledTimes(1);
  });

  it('closes the warning and lets the person try again', async () => {
    const renderer = await renderFlow();
    await press(renderer, 'Enviar nota fiscal');

    expect(trigger(renderer).props.disabled).toBe(true);
    await act(async () => {
      renderer.root.findByType(OfflineNoticeSheet).props.onClose();
    });

    expect(trigger(renderer).props.disabled).toBeFalsy();
    expect(pickPdfMock).not.toHaveBeenCalled();
  });

  it('opens the PDF picker once, when the warning has left', async () => {
    pickPdfMock.mockResolvedValue(PDF);
    const renderer = await renderFlow();
    await press(renderer, 'Enviar nota fiscal');

    await press(renderer, 'Cadastrar manualmente');
    await noticeLeft(renderer);
    await noticeLeft(renderer);

    expect(pickPdfMock).toHaveBeenCalledTimes(1);
  });

  it('does not open the picker when the warning is just closed', async () => {
    const renderer = await renderFlow();
    await press(renderer, 'Enviar nota fiscal');

    await act(async () => {
      renderer.root.findByType(OfflineNoticeSheet).props.onClose();
    });
    await noticeLeft(renderer);

    expect(pickPdfMock).not.toHaveBeenCalled();
  });
});

describe('the manual entry', () => {
  it('opens the same review, empty, saying where the note will be kept', async () => {
    const renderer = await renderFlow();

    await openManualReview(renderer);

    const shown = texts(renderer);
    expect(shown).toContain('Revisar nota fiscal');
    expect(shown).toContain('Cadastro manual:');
    expect(shown).toContain('nota.pdf');
    expect(shown).not.toContain('Não conseguimos ler a nota');
    expect(field(renderer, 'Valor total').props.value).toBe('');
    expect(shown).toContain('Salvar nota');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('accepts only a PDF, like the online upload', async () => {
    pickPdfMock.mockResolvedValue({ ...PDF, name: 'foto.jpg' });
    const renderer = await renderFlow();
    await press(renderer, 'Enviar nota fiscal');
    await press(renderer, 'Cadastrar manualmente');
    await noticeLeft(renderer);

    expect(texts(renderer)).toContain(
      'Só aceitamos notas em PDF. Escolha um arquivo .pdf.',
    );
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('validates like the online review, saving nothing while a field is wrong', async () => {
    const renderer = await renderFlow();
    await openManualReview(renderer);

    await press(renderer, 'Salvar nota');

    const shown = texts(renderer);
    expect(shown).toContain('Informe a data de emissão.');
    expect(shown).toContain('Informe o valor total.');
    expect(shown).toContain('Escolha o tomador da nota.');
    expect(await storedOutbox()).toEqual([]);
    expect(savePdfMock).not.toHaveBeenCalled();
  });

  it('saves the data and the PDF on the device, with the id made by the app', async () => {
    const renderer = await renderFlow();
    await openManualReview(renderer);
    await fillManualNote(renderer);

    await press(renderer, 'Salvar nota');

    const [saved] = await storedOutbox();
    expect(saved).toMatchObject({
      id: 'app-generated-id',
      issueDate: '2026-03-15',
      amount: 1850,
      number: '2026/0042',
      clientId: 'client-1',
      file: { name: 'nota.pdf', bytesSize: 3, hash: '010203' },
    });
    expect(savePdfMock).toHaveBeenCalledWith(
      'user-1',
      'app-generated-id',
      PDF.bytes,
    );
    expect(confirmMock).not.toHaveBeenCalled();
    expect(texts(renderer)).not.toContain('Revisar nota fiscal');
  });

  it('shows the note as waiting to be sent', async () => {
    const renderer = await renderFlow();
    await openManualReview(renderer);
    await fillManualNote(renderer);

    await press(renderer, 'Salvar nota');

    expect(texts(renderer)).toContain('1 nota aguardando envio');
  });

  it('says so when the note cannot be saved on the device', async () => {
    savePdfMock.mockImplementation(() => {
      throw new Error('disk full');
    });
    const renderer = await renderFlow();
    await openManualReview(renderer);
    await fillManualNote(renderer);

    await press(renderer, 'Salvar nota');

    expect(texts(renderer)).toContain(
      'Não foi possível salvar a nota neste aparelho. Tente novamente.',
    );
    expect(texts(renderer)).toContain('Revisar nota fiscal');
    expect(await storedOutbox()).toEqual([]);
  });

  it('lets a note point at a taker registered offline, which the online review refuses', async () => {
    createClientMock.mockResolvedValue({
      ...CLINIC,
      id: 'local:taker-1',
      name: 'Clínica Nova',
    });
    const renderer = await renderFlow();
    await openManualReview(renderer);
    await type(renderer, 'Data de emissão', '15032026');
    await type(renderer, 'Valor total', '185000');
    await press(renderer, 'Cadastrar novo tomador');
    await act(async () => {
      renderer.root.findByType(FullScreenModalType).props.onDismiss();
    });
    await type(renderer, 'Nome da clínica', 'Clínica Nova');
    await type(renderer, 'CNPJ', '11222333000181');
    await type(renderer, 'Endereço', 'Rua das Hortênsias, 340');
    await type(renderer, 'Cidade', 'Campinas');
    await type(renderer, 'UF', 'SP');
    await type(renderer, 'Contato', '1134567890');
    await type(renderer, 'E-mail', 'contato@novaexemplo.com.br');
    await type(renderer, 'Responsável', 'Dr André Matos');
    await press(renderer, 'Confirmar');
    await act(async () => {
      renderer.root.findByType(NewClinicSheetType).props.onClosed();
    });

    await press(renderer, 'Salvar nota');

    expect(texts(renderer)).not.toContain('ainda aguarda sincronização');
    const [saved] = await storedOutbox();
    expect(saved.clientId).toBe('local:taker-1');
  });
});

describe('notes waiting to be sent', () => {
  it('counts them, in the singular and in the plural', async () => {
    await seedOutbox(pendingNote('a'), pendingNote('b'));
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain('2 notas aguardando envio');
  });

  it('says nothing when the queue is empty', async () => {
    const renderer = await renderFlow();

    expect(texts(renderer)).not.toContain('aguardando envio');
  });

  it('counts a refused note apart, as an alert', async () => {
    await seedOutbox(
      pendingNote('a', { rejection: { code: 'X', acknowledged: true } }),
    );
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain('1 nota não pôde ser enviada');
    expect(texts(renderer)).not.toContain('aguardando envio');
  });

  it('tells why a refused note was not sent, once, and keeps counting it', async () => {
    await seedOutbox(
      pendingNote('a', {
        rejection: { code: 'CLIENT_NOT_SYNCED', acknowledged: false },
      }),
    );
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain('Nota não enviada');
    expect(texts(renderer)).toContain('o tomador não pôde ser cadastrado.');
    expect(texts(renderer)).toContain('15/03/2026');

    await press(renderer, 'Manter na fila');

    expect((await storedOutbox())[0].rejection?.acknowledged).toBe(true);
    expect(texts(renderer)).toContain('1 nota não pôde ser enviada');
  });

  it.each([
    ['SERVICE_INVOICE_FILE_DUPLICATED', 'este PDF já foi enviado antes.'],
    ['SERVICE_INVOICE_FILE_TOO_LARGE', 'o PDF passa do limite de 15 MB.'],
    ['CLIENT_NOT_SYNCED', 'o tomador não pôde ser cadastrado.'],
    ['PENDING_FILE_MISSING', 'o PDF não está mais neste aparelho.'],
  ])('tells the reason of a %s refusal', async (code, reason) => {
    await seedOutbox(
      pendingNote('a', { rejection: { code, acknowledged: false } }),
    );
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain(reason);
  });

  it.each([['SOMETHING_NEW'], [null]])(
    'falls back to a general reason for the code %p',
    async code => {
      await seedOutbox(
        pendingNote('a', { rejection: { code, acknowledged: false } }),
      );
      const renderer = await renderFlow();

      expect(texts(renderer)).toContain('o servidor recusou os dados.');
    },
  );

  it('does not send anything itself: the app does, whichever tab is open', async () => {
    await seedOutbox(pendingNote('a'));
    await renderFlow();

    expect(connectionMock).not.toHaveBeenCalled();
  });

  it('warns when the saved notes cannot be read', async () => {
    await AsyncStorage.setItem(OUTBOX_KEY, '{not json');
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain(
      'Não foi possível ler as notas guardadas neste aparelho.',
    );
  });
});

describe('discarding a refused note', () => {
  const refusedNote = (id = 'a') =>
    pendingNote(id, { rejection: { code: 'X', acknowledged: false } });

  it('offers to discard it next to keeping it, discarding being the one that needs a decision', async () => {
    await seedOutbox(refusedNote());
    const renderer = await renderFlow();

    expect(texts(renderer)).toContain('Descartar nota');
    expect(texts(renderer)).toContain('Manter na fila');
  });

  it('removes the note from the queue and its PDF from the disk', async () => {
    await seedOutbox(refusedNote('a'), pendingNote('b'));
    const renderer = await renderFlow();

    await press(renderer, 'Descartar nota');

    expect((await storedOutbox()).map(note => note.id)).toEqual(['b']);
    expect(removePdfMock).toHaveBeenCalledWith('user-1', 'a');
    expect(texts(renderer)).not.toContain('Nota não enviada');
    expect(texts(renderer)).not.toContain('não pôde ser enviada');
    expect(texts(renderer)).toContain('1 nota aguardando envio');
  });

  it('does not discard anything when the sheet is just closed', async () => {
    await seedOutbox(refusedNote());
    const renderer = await renderFlow();

    await press(renderer, 'Manter na fila');

    expect(await storedOutbox()).toHaveLength(1);
    expect(removePdfMock).not.toHaveBeenCalled();
  });

  it('still drops the note when the PDF cannot be deleted, and says so', async () => {
    await seedOutbox(refusedNote());
    removePdfMock.mockImplementation(() => {
      throw new Error('locked');
    });
    const renderer = await renderFlow();

    await press(renderer, 'Descartar nota');

    expect(await storedOutbox()).toEqual([]);
    expect(texts(renderer)).toContain(
      'A nota foi descartada, mas o PDF não pôde ser apagado deste aparelho.',
    );

    await press(renderer, 'Entendi');
    expect(texts(renderer)).not.toContain('descartada, mas o PDF');
  });

  it('brings the notice back from the count for whoever closed it without deciding', async () => {
    await seedOutbox(refusedNote());
    const renderer = await renderFlow();
    await press(renderer, 'Manter na fila');
    expect(texts(renderer)).not.toContain('Nota não enviada');
    expect(texts(renderer)).toContain('1 nota não pôde ser enviada');

    await press(renderer, 'Ver nota');

    expect(texts(renderer)).toContain('Nota não enviada');
    expect(texts(renderer)).toContain('Descartar nota');
  });
});

describe('the size of the PDF of a note typed by hand', () => {
  const FIFTEEN_MB = 15 * 1024 * 1024;

  async function saveWithPdfOf(bytesSize: number) {
    pickPdfMock.mockResolvedValue({ ...PDF, bytes: new Uint8Array(bytesSize) });
    const renderer = await renderFlow();
    await press(renderer, 'Enviar nota fiscal');
    await press(renderer, 'Cadastrar manualmente');
    await noticeLeft(renderer);
    await fillManualNote(renderer);
    await press(renderer, 'Salvar nota');
    return renderer;
  }

  it('saves a PDF of exactly 15 MB', async () => {
    const renderer = await saveWithPdfOf(FIFTEEN_MB);

    expect(await storedOutbox()).toHaveLength(1);
    expect(texts(renderer)).not.toContain('passa de 15 MB');
  });

  it('refuses one byte more, saying so on the review, and saves nothing', async () => {
    const renderer = await saveWithPdfOf(FIFTEEN_MB + 1);

    expect(texts(renderer)).toContain(
      'O PDF passa de 15 MB, o limite aceito. Volte e escolha outro arquivo.',
    );
    expect(texts(renderer)).toContain('Revisar nota fiscal');
    expect(await storedOutbox()).toEqual([]);
    expect(savePdfMock).not.toHaveBeenCalled();
  });
});

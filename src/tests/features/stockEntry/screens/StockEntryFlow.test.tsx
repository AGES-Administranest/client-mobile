import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type {
  DraftDetail,
  DraftSummary,
} from 'features/stockEntry/domain/draft';
import type { Extraction } from 'features/stockEntry/domain/extraction';
import type {
  InvoiceDocument,
  PickedFile,
} from 'features/stockEntry/domain/invoiceDocument';
import { StockEntryFlow } from 'features/stockEntry/screens/StockEntryFlow';
import { describeDocument } from 'features/stockEntry/services/invoiceDocumentService';
import {
  pickInvoiceImage,
  pickPdf,
} from 'features/stockEntry/services/invoiceSource';
import {
  uploadInvoiceDocument,
  UploadError,
} from 'features/stockEntry/services/invoiceUploadService';
import {
  discardEntry,
  getEntry,
  listDrafts,
  saveHeader,
  saveLines,
} from 'features/stockEntry/services/stockEntryService';
import { ApiError } from 'shared/api';
import { I18nProvider } from 'shared/i18n';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

// The camera and the pickers are native; the flow is what is under test.
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));
jest.mock('features/stockEntry/services/invoiceSource', () => ({
  PickError: class PickError extends Error {},
  pickPdf: jest.fn(),
  pickInvoiceImage: jest.fn(),
  readImageFile: jest.fn(),
}));
jest.mock('features/stockEntry/services/invoiceDocumentService', () => ({
  describeDocument: jest.fn(),
}));
jest.mock('features/stockEntry/services/invoiceUploadService', () => ({
  ...jest.requireActual('features/stockEntry/services/invoiceUploadService'),
  uploadInvoiceDocument: jest.fn(),
}));
jest.mock('features/stockEntry/services/stockEntryService', () => ({
  listDrafts: jest.fn(),
  getEntry: jest.fn(),
  saveHeader: jest.fn(),
  saveLines: jest.fn(),
  discardEntry: jest.fn(),
}));

const pickPdfMock = pickPdf as jest.MockedFunction<typeof pickPdf>;
const pickImageMock = pickInvoiceImage as jest.MockedFunction<
  typeof pickInvoiceImage
>;
const describeMock = describeDocument as jest.MockedFunction<
  typeof describeDocument
>;
const uploadMock = uploadInvoiceDocument as jest.MockedFunction<
  typeof uploadInvoiceDocument
>;
const listDraftsMock = listDrafts as jest.MockedFunction<typeof listDrafts>;
const getEntryMock = getEntry as jest.MockedFunction<typeof getEntry>;
const saveHeaderMock = saveHeader as jest.MockedFunction<typeof saveHeader>;
const saveLinesMock = saveLines as jest.MockedFunction<typeof saveLines>;
const discardMock = discardEntry as jest.MockedFunction<typeof discardEntry>;

const PICKED: PickedFile = {
  uri: 'file:///cache/cotacao.pdf',
  bytes: new Uint8Array([1, 2, 3]),
  name: 'cotacao.pdf',
  mimeType: 'application/pdf',
};

const DOCUMENT: InvoiceDocument = {
  ...PICKED,
  id: '5f3b7d0c-2a1e-4c7b-9a11-1f2e3d4c5b6a',
  sizeBytes: 3,
  hash: 'a'.repeat(64),
};

// A linked line, one the reading could not link, and one without quantity.
const EXTRACTION: Extraction = {
  status: 'SUCCESS',
  invoiceNumber: '8842',
  orderDate: '2026-08-18',
  totalAmount: 490,
  items: [
    {
      extractedDescription: 'PROPOFOL 1% 20ML FR',
      quantity: 20,
      unitValue: 22.5,
      totalValue: 450,
      arithmeticCheck: true,
      match: {
        decision: 'preselected',
        itemId: 'propofol',
        reason: 'FUZZY',
        confidence: 0.91,
        candidates: [
          {
            itemId: 'propofol',
            name: 'Propofol 1% 20 mL',
            unit: 'VIAL',
            score: 0.91,
          },
        ],
      },
    },
    {
      extractedDescription: 'CATETER IV 22G',
      quantity: 10,
      unitValue: 4,
      totalValue: 40,
      arithmeticCheck: true,
      match: {
        decision: 'suggested',
        candidates: [
          {
            itemId: 'cateter-22',
            name: 'Cateter IV 22G',
            unit: 'UNIT',
            score: 0.6,
          },
          {
            itemId: 'cateter-24',
            name: 'Cateter IV 24G',
            unit: 'UNIT',
            score: 0.5,
          },
        ],
      },
    },
    {
      extractedDescription: 'SERINGA 60ML CX 30UN',
      unitValue: 30,
      arithmeticCheck: false,
      match: {
        decision: 'preselected',
        itemId: 'seringa',
        reason: 'FUZZY',
        confidence: 0.9,
        candidates: [
          { itemId: 'seringa', name: 'Seringa 60 mL', unit: 'BOX', score: 0.9 },
        ],
      },
    },
  ],
};

const READY_DRAFT: DraftSummary = {
  id: 'invoice-ready',
  fileName: 'nota-8842.pdf',
  fileMimeType: 'application/pdf',
  supplierName: 'Vet Distribuidora',
  invoiceNumber: '8842',
  orderDate: '2026-08-18',
  totalAmount: 490,
  extractionStatus: 'SUCCESS',
  uploadedAt: '2026-09-28T12:00:00.000Z',
  updatedAt: '2026-09-28T12:00:00.000Z',
};

// Saved once: the propofol line was confirmed with its lot.
const SAVED_DETAIL: DraftDetail = {
  id: READY_DRAFT.id,
  extraction: EXTRACTION,
  lines: [
    {
      sourceIndex: 0,
      description: 'PROPOFOL 1% 20ML FR',
      item: { id: 'propofol', name: 'Propofol 1% 20 mL', unit: 'VIAL' },
      quantity: 7,
      unitCost: 22.5,
      lotNumber: 'PF8821',
      expirationDate: '2027-05-31',
      candidates: [],
    },
  ],
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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

// The sheets slide in and out on Animated timers; the test drives those by
// hand so every step settles before the next assertion.
jest.useFakeTimers();

let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

async function settle() {
  await act(async () => {
    jest.runAllTimers();
  });
}

async function renderFlow(
  props: React.ComponentProps<typeof StockEntryFlow> = {},
) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <StockEntryFlow {...props} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  await settle();

  return renderer!;
}

/** Presses the last pressable whose text includes `label`. */
async function press(flow: ReactTestRenderer.ReactTestRenderer, label: string) {
  await act(async () => {
    flow.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          JSON.stringify(
            node.findAllByType('Text' as never).map(t => t.props.children),
          ).includes(label),
      )
      .at(-1)!
      .props.onPress();
  });
  await settle();
}

/** Presses the control a screen reader would announce as `label`. */
async function pressLabelled(
  flow: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  await act(async () => {
    flow.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel === label,
      )
      .at(-1)!
      .props.onPress();
  });
  await settle();
}

async function type(
  flow: ReactTestRenderer.ReactTestRenderer,
  label: string,
  text: string,
) {
  await act(async () => {
    flow.root
      .findAll(
        node =>
          typeof node.type === 'string' &&
          typeof node.props.onChangeText === 'function' &&
          node.props.accessibilityLabel === label,
      )
      .at(-1)!
      .props.onChangeText(text);
  });
}

function texts(flow: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    flow.root.findAllByType('Text' as never).map(node => node.props.children),
  );
}

function inputValues(flow: ReactTestRenderer.ReactTestRenderer) {
  return flow.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.onChangeText === 'function',
    )
    .map(node => node.props.value);
}

async function openEntries(
  props: React.ComponentProps<typeof StockEntryFlow> = {},
) {
  const flow = await renderFlow(props);
  await press(flow, 'Entradas');
  return flow;
}

async function sendPdf() {
  const flow = await openEntries();
  await press(flow, 'Nova entrada');
  await press(flow, 'Anexar PDF');
  await press(flow, 'Enviar este arquivo');
  return flow;
}

beforeEach(() => {
  pickPdfMock.mockReset().mockResolvedValue(PICKED);
  pickImageMock.mockReset();
  describeMock.mockReset().mockResolvedValue(DOCUMENT);
  uploadMock.mockReset().mockResolvedValue(EXTRACTION);
  listDraftsMock.mockReset().mockResolvedValue([]);
  getEntryMock.mockReset().mockResolvedValue(SAVED_DETAIL);
  saveHeaderMock.mockReset().mockResolvedValue(undefined);
  saveLinesMock.mockReset().mockResolvedValue(undefined);
  discardMock.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
  renderer = undefined;
});

describe('the pending list', () => {
  it('shows what is waiting, with its status', async () => {
    listDraftsMock.mockResolvedValue([READY_DRAFT]);
    const flow = await openEntries();

    const shown = texts(flow);
    expect(shown).toContain('Vet Distribuidora');
    expect(shown).toContain('PDF · NF 8842 · 18/08/2026');
    expect(shown).toContain('Pronta para conferir');
  });

  it('reopens a saved entry as it was left', async () => {
    listDraftsMock.mockResolvedValue([READY_DRAFT]);
    const flow = await openEntries();

    await press(flow, 'Conferir');

    expect(getEntryMock).toHaveBeenCalledWith(SESSION.idToken, READY_DRAFT.id);
    const shown = texts(flow);
    expect(shown).toContain('PF8821');
    expect(shown).toContain('31/05/2027');
    expect(shown).toContain('7 frasco');
  });

  it('discards an entry after asking', async () => {
    listDraftsMock.mockResolvedValue([READY_DRAFT]);
    const flow = await openEntries();

    await press(flow, 'Descartar');
    expect(texts(flow)).toContain('Descartar esta entrada?');
    await press(flow, 'Descartar');

    expect(discardMock).toHaveBeenCalledWith(SESSION.idToken, READY_DRAFT.id);
  });
});

describe('a new entry', () => {
  it('shows the PDF before sending anything', async () => {
    const flow = await openEntries();
    await press(flow, 'Nova entrada');
    await press(flow, 'Anexar PDF');

    expect(texts(flow)).toContain('cotacao.pdf');
    expect(texts(flow)).toContain('Enviar este arquivo');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('opens the review with what the API read', async () => {
    const flow = await sendPdf();

    expect(uploadMock).toHaveBeenCalledWith(DOCUMENT, SESSION.idToken);
    const shown = texts(flow);
    expect(shown).toContain('PROPOFOL 1% 20ML FR');
    expect(shown).toContain('Propofol 1% 20 mL');
    expect(shown).toContain('Sem item vinculado');
    expect(shown).toContain('2 linhas precisam de atenção');
    expect(shown).toContain(
      'A quantidade não veio na nota. Nada entraria no estoque assim.',
    );
    expect(inputValues(flow)).toEqual(
      expect.arrayContaining(['8842', '18/08/2026', '490,00']),
    );
  });

  it('offers the existing entry when the same PDF was already sent', async () => {
    uploadMock.mockRejectedValue(
      new UploadError(
        'duplicateFile',
        new ApiError(409, 'INVOICE_FILE_DUPLICATED', 'duplicated', {
          purchaseInvoiceId: 'invoice-existing',
        }),
      ),
    );
    const flow = await sendPdf();
    expect(texts(flow)).toContain('Documento já enviado');

    await press(flow, 'Abrir a entrada existente');

    expect(getEntryMock).toHaveBeenCalledWith(
      SESSION.idToken,
      'invoice-existing',
    );
  });

  it('offers another PDF for the same entry when the one sent has no text', async () => {
    uploadMock.mockResolvedValue({
      status: 'FAILED',
      failureReason: 'NO_TEXT_LAYER',
      items: [],
    });
    const flow = await sendPdf();
    expect(texts(flow)).toContain('Este PDF não tem texto');

    await press(flow, 'Trocar por PDF com texto');

    expect(pickPdfMock).toHaveBeenCalledTimes(2);
    expect(describeMock).toHaveBeenLastCalledWith(PICKED, DOCUMENT.id);
    expect(texts(flow)).toContain('Confirmar arquivo');
  });

  it('tells a photo is kept only as a receipt', async () => {
    pickImageMock.mockResolvedValue({ ...PICKED, mimeType: 'image/jpeg' });
    uploadMock.mockResolvedValue({ status: 'MANUAL', items: [] });
    const flow = await openEntries();

    await press(flow, 'Nova entrada');
    await press(flow, 'Fotografar a nota');
    await press(flow, 'Escolher da galeria');

    expect(uploadMock).toHaveBeenCalled();
    expect(texts(flow)).toContain('A foto ficou anexada como comprovante');
  });

  it('goes quietly back when the picker is cancelled', async () => {
    pickPdfMock.mockResolvedValue(null);
    const flow = await openEntries();
    await press(flow, 'Nova entrada');
    await press(flow, 'Anexar PDF');

    expect(uploadMock).not.toHaveBeenCalled();
    expect(texts(flow)).not.toContain('Confirmar arquivo');
  });
});

describe('the review', () => {
  it('links a line to a suggestion from the reading', async () => {
    const flow = await sendPdf();

    await press(flow, 'Vincular a um item');
    expect(texts(flow)).toContain('SUGESTÕES DA LEITURA');
    expect(texts(flow)).toContain('Cateter IV 24G');

    await press(flow, 'Cateter IV 22G');

    expect(texts(flow)).not.toContain('Sem item vinculado');
    expect(texts(flow)).toContain('1 linha precisa de atenção');
  });

  it('saves the draft a moment after an edit', async () => {
    const flow = await sendPdf();

    await press(flow, 'Informar quantidade');
    await type(flow, 'QTD', '4');
    await settle();

    expect(saveLinesMock).toHaveBeenLastCalledWith(
      SESSION.idToken,
      DOCUMENT.id,
      expect.arrayContaining([
        expect.objectContaining({ sourceIndex: 2, quantity: 4 }),
      ]),
    );
    expect(texts(flow)).toContain('Rascunho salvo agora');
    expect(texts(flow)).not.toContain('A quantidade não veio na nota');
  });

  it('asks before leaving when the draft could not be saved', async () => {
    saveLinesMock.mockRejectedValue(new Error('offline'));
    const flow = await sendPdf();
    await press(flow, 'Informar quantidade');
    await type(flow, 'QTD', '4');
    await settle();
    expect(texts(flow)).toContain('Não foi possível salvar');

    await pressLabelled(flow, 'Fechar conferência');
    expect(texts(flow)).toContain('Sair da conferência?');

    await press(flow, 'Sair sem salvar');
    expect(texts(flow)).not.toContain('ITENS DA NOTA');
  });
});

describe('"Digitar insumo"', () => {
  it('hands it to the item form and closes the entry screens', async () => {
    const onTypeItem = jest.fn();
    const flow = await openEntries({ onTypeItem });

    await press(flow, 'Nova entrada');
    await press(flow, 'Digitar insumo');

    expect(onTypeItem).toHaveBeenCalledTimes(1);
    expect(texts(flow)).not.toContain('Fotografar a nota');
    expect(texts(flow)).not.toContain('Nova entrada');
  });

  it('just dismisses when no form is wired in', async () => {
    const flow = await openEntries();

    await press(flow, 'Nova entrada');
    await press(flow, 'Digitar insumo');

    expect(texts(flow)).not.toContain('Fotografar a nota');
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

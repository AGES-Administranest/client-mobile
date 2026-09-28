import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { StockEntryFlow } from './StockEntryFlow';
import type { InvoiceDocument, PickedFile } from '../domain/invoiceDocument';
import { describeDocument } from '../services/invoiceDocumentService';
import { pickPdf } from '../services/invoiceSource';
import { uploadInvoiceDocument } from '../services/invoiceUploadService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

// The camera and the pickers are native; the flow is what is under test.
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));
jest.mock('../services/invoiceSource', () => ({
  pickPdf: jest.fn(),
  pickInvoiceImage: jest.fn(),
  readImageFile: jest.fn(),
}));
jest.mock('../services/invoiceDocumentService', () => ({
  describeDocument: jest.fn(),
}));
jest.mock('../services/invoiceUploadService', () => ({
  uploadInvoiceDocument: jest.fn(),
}));

const pickPdfMock = pickPdf as jest.MockedFunction<typeof pickPdf>;
const describeMock = describeDocument as jest.MockedFunction<
  typeof describeDocument
>;
const uploadMock = uploadInvoiceDocument as jest.MockedFunction<
  typeof uploadInvoiceDocument
>;

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
  name: 'Bruna Senha',
  email: 'bruna@example.com',
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

function texts(flow: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    flow.root.findAllByType('Text' as never).map(node => node.props.children),
  );
}

/** The editable name of each item on the review sheet (host nodes only). */
function nameInputs(flow: ReactTestRenderer.ReactTestRenderer) {
  return flow.root.findAll(
    node =>
      typeof node.type === 'string' &&
      typeof node.props.onChangeText === 'function' &&
      node.props.placeholder === 'Nome do item',
  );
}

async function attachPdf() {
  const flow = await renderFlow();
  await press(flow, 'Registrar entrada');
  await press(flow, 'Anexar PDF');
  return flow;
}

beforeEach(() => {
  pickPdfMock.mockReset().mockResolvedValue(PICKED);
  describeMock.mockReset().mockResolvedValue(DOCUMENT);
  uploadMock.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
  renderer = undefined;
});

it('opens the review with the extracted items after attaching a PDF', async () => {
  const flow = await attachPdf();

  expect(uploadMock).toHaveBeenCalledWith(DOCUMENT, SESSION.idToken);

  const names = nameInputs(flow).map(input => input.props.value);
  expect(names).toEqual([
    'PROPOFOL 10MG/ML F/A 20ML',
    'CETAMINA 10% 50ML',
    'SERINGA 60ML CX 30UN',
  ]);
  expect(texts(flow)).toContain('3 itens encontrados');
});

it('flags the item whose quantity could not be read', async () => {
  const flow = await attachPdf();

  const warnings = flow.root
    .findAllByType('Text' as never)
    .filter(node => node.props.children === 'Confira o nome e a quantidade');
  expect(warnings).toHaveLength(1);
});

it('lets the user correct an extracted name', async () => {
  const flow = await attachPdf();

  await act(async () => {
    nameInputs(flow)[1].props.onChangeText('CETAMINA 10% 10ML');
  });

  expect(nameInputs(flow)[1].props.value).toBe('CETAMINA 10% 10ML');
});

it('hands "Digitar insumo" to the item form and closes its own menu', async () => {
  const onTypeItem = jest.fn();
  const flow = await renderFlow({ onTypeItem });

  await press(flow, 'Registrar entrada');
  expect(texts(flow)).toContain('Digitar insumo');

  await press(flow, 'Digitar insumo');

  expect(onTypeItem).toHaveBeenCalledTimes(1);
  // The menu is gone, so the form is not left behind a second sheet.
  expect(texts(flow)).not.toContain('Escanear nota');
});

it('just dismisses "Digitar insumo" when no form is wired in', async () => {
  const flow = await renderFlow();

  await press(flow, 'Registrar entrada');
  await press(flow, 'Digitar insumo');

  expect(texts(flow)).not.toContain('Escanear nota');
  expect(uploadMock).not.toHaveBeenCalled();
});

it('goes quietly back when the picker is cancelled', async () => {
  pickPdfMock.mockResolvedValue(null);
  const flow = await attachPdf();

  expect(uploadMock).not.toHaveBeenCalled();
  expect(nameInputs(flow)).toHaveLength(0);
});

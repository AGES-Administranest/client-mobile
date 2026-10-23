import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LoadingOverlay } from 'app/components/ui/loading-overlay';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Client } from 'features/clients/domain/client';
import { fetchClients } from 'features/clients/services/clientService';
import { ServiceInvoiceUploadFlow } from 'features/serviceInvoices';
import {
  confirmServiceInvoice,
  extractServiceInvoice,
} from 'features/serviceInvoices/services/serviceInvoiceService';
import { I18nProvider } from 'shared/i18n';
import { pickPdf } from 'shared/services/pdfPicker';

jest.mock('shared/services/pdfPicker', () => ({ pickPdf: jest.fn() }));
jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  extractServiceInvoice: jest.fn(),
  confirmServiceInvoice: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
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
const fetchClientsMock = fetchClients as jest.MockedFunction<
  typeof fetchClients
>;

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
  fetchClientsMock.mockReset();
  fetchClientsMock.mockResolvedValue([CLINIC]);
  confirmMock.mockResolvedValue({ id: 'invoice-1' });
});

async function renderFlow() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
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

  it('treats a reading that breaks like a failed one', async () => {
    extractMock.mockRejectedValue(new Error('network'));
    const renderer = await renderFlow();

    await startWith(renderer, 'nota.pdf');

    expect(texts(renderer)).toContain(
      'Não conseguimos ler a nota. Preencha os dados manualmente.',
    );
    expect(field(renderer, 'Valor total').props.value).toBe('');
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

    expect(confirmMock).toHaveBeenCalledWith('id-token', {
      issueDate: '2026-03-15',
      amount: 1850,
      clientId: 'client-1',
    });
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
});

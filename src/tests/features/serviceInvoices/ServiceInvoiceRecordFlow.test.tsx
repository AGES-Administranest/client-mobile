import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ServiceInvoiceRecord } from 'features/serviceInvoices/domain/serviceInvoiceRecord.types';
import type { ServiceInvoiceUploadState } from 'features/serviceInvoices/hooks/useServiceInvoiceUpload';
import { ServiceInvoicesFlow } from 'features/serviceInvoices/screens/ServiceInvoicesFlow';
import { ServiceInvoicesSection } from 'features/serviceInvoices/screens/ServiceInvoicesSection';
import { savePdfToDevice } from 'features/serviceInvoices/services/invoicePdfSaver';
import { saveServiceInvoiceCache } from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import {
  correctServiceInvoice,
  deleteConfirmedServiceInvoice,
  fetchServiceInvoiceRecord,
  fetchServiceInvoices,
  requestServiceInvoiceDownload,
} from 'features/serviceInvoices/services/serviceInvoiceRecordService';
import { isOnline, onConnectionRestored } from 'shared/services';
import { ApiError } from 'shared/services/apiClient';

import { renderScreen } from '../../support/screen';

const mockAuth = {
  session: { idToken: 'token' },
  account: { id: 'user-1' },
};
const mockNames = { 'client-1': 'VetSul' };
const mockSearch = {
  term: '',
  status: 'idle',
  options: [],
  onTermChange: jest.fn(),
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/clients', () => {
  const { View } = require('react-native');
  return {
    ClientAutocomplete: View,
    isLocalClientId: (id: string) => id.startsWith('local:'),
    useClientNames: () => mockNames,
    useClientSearch: () => mockSearch,
  };
});
jest.mock('features/invoices', () => ({
  TaxPackageDownloadAction: () => null,
}));
jest.mock('features/serviceInvoices/screens/ServiceInvoiceUploadFlow', () => ({
  ServiceInvoiceUploadFlow: () => null,
}));
jest.mock('features/serviceInvoices/services/invoicePdfSaver', () => ({
  savePdfToDevice: jest.fn(),
}));
jest.mock(
  'features/serviceInvoices/services/serviceInvoiceRecordService',
  () => ({
    correctServiceInvoice: jest.fn(),
    deleteConfirmedServiceInvoice: jest.fn(),
    fetchServiceInvoiceRecord: jest.fn(),
    fetchServiceInvoices: jest.fn(),
    requestServiceInvoiceDownload: jest.fn(),
  }),
);
jest.mock('shared/services', () => ({
  ...jest.requireActual('shared/services'),
  isOnline: jest.fn(),
  onConnectionRestored: jest.fn(),
}));

const fetchRecord = jest.mocked(fetchServiceInvoiceRecord);
const fetchList = jest.mocked(fetchServiceInvoices);
const NETWORK_DOWN = new TypeError('Network request failed');

const RECORD: ServiceInvoiceRecord = {
  id: 'note-1',
  number: '10',
  issueDate: '2026-10-20',
  amount: 150,
  clientId: 'client-1',
  clientName: 'VetSul',
  clientTaxId: '12.345.678/0001-90',
  location: 'Porto Alegre, RS',
  hasFile: true,
  syncStatus: 'SYNCED',
  file: { name: 'nota-10.pdf', bytesSize: 2048 },
};

const onClose = jest.fn();
const start = jest.fn();
const upload = { start } as unknown as ServiceInvoiceUploadState;

const openNote = () =>
  renderScreen(
    <ServiceInvoicesFlow
      open
      initialInvoiceId="note-1"
      onClose={onClose}
      upload={upload}
    />,
  );

beforeEach(async () => {
  // Not resetAllMocks: it would also empty the AsyncStorage mock.
  jest.clearAllMocks();
  jest.mocked(correctServiceInvoice).mockReset();
  jest.mocked(deleteConfirmedServiceInvoice).mockReset();
  jest.mocked(requestServiceInvoiceDownload).mockReset();
  jest.mocked(savePdfToDevice).mockReset();
  fetchRecord.mockReset();
  fetchList.mockReset();
  jest.mocked(isOnline).mockResolvedValue(true);
  jest.mocked(onConnectionRestored).mockReturnValue(() => {});
  fetchRecord.mockResolvedValue(RECORD);
  fetchList.mockResolvedValue({ items: [RECORD], total: 1 });
  await AsyncStorage.clear();
});

describe('the detail of a note', () => {
  it('shows everything the note has', async () => {
    const screen = await openNote();

    for (const value of [
      'nota-10.pdf',
      '20/10/2026',
      'VetSul',
      '12.345.678/0001-90',
      'Porto Alegre, RS',
      'Sincronizado',
    ]) {
      expect(screen.text()).toContain(value);
    }
    expect(screen.isDisabled('Corrigir')).toBe(false);
  });

  it('leaves out what the note does not have', async () => {
    fetchRecord.mockResolvedValue({
      ...RECORD,
      number: null,
      clientTaxId: null,
      location: null,
      file: null,
      hasFile: false,
    });

    const screen = await openNote();

    expect(screen.has('PDF da nota fiscal')).toBe(true);
    expect(screen.has('Número da nota')).toBe(false);
    expect(screen.has('CNPJ do tomador')).toBe(false);
    expect(screen.has('Esta nota não tem PDF original.')).toBe(true);
    expect(screen.isDisabled('Baixar PDF')).toBe(true);
  });

  it('goes back when the note does not exist any more', async () => {
    fetchRecord.mockRejectedValue(new ApiError('gone', null, 404));

    const screen = await openNote();

    expect(screen.has('Esta nota não existe mais.')).toBe(true);
    await screen.press('Voltar');
    expect(onClose).toHaveBeenCalled();
  });

  it('can be loaded again after a failure', async () => {
    fetchRecord.mockRejectedValueOnce(new ApiError('broke', null, 500));
    const screen = await openNote();
    expect(screen.has('Não foi possível carregar a nota.')).toBe(true);

    await screen.press('Tentar novamente');

    expect(screen.has('nota-10.pdf')).toBe(true);
  });

  it('cannot be corrected or downloaded from the saved copy', async () => {
    await saveServiceInvoiceCache('user-1', [RECORD]);
    fetchRecord.mockRejectedValue(NETWORK_DOWN);

    const screen = await openNote();

    expect(screen.isDisabled('Corrigir')).toBe(true);
    expect(screen.has('Corrigir os dados exige conexão com a internet.')).toBe(
      true,
    );
    expect(screen.has('O download exige conexão com a internet.')).toBe(true);
  });
});

describe('downloading the PDF', () => {
  const download = jest.mocked(requestServiceInvoiceDownload);

  beforeEach(() => {
    download.mockResolvedValue({ url: 'https://s3/nota', filename: 'n.pdf' });
  });

  it('saves the file of the note', async () => {
    jest.mocked(savePdfToDevice).mockResolvedValue('saved');
    const screen = await openNote();

    await screen.press('Baixar PDF');

    expect(savePdfToDevice).toHaveBeenCalledWith('https://s3/nota', 'n.pdf');
    expect(screen.has('PDF salvo na pasta escolhida.')).toBe(true);
  });

  it('says nothing when the person gives up choosing a folder', async () => {
    jest.mocked(savePdfToDevice).mockResolvedValue('cancelled' as never);
    const screen = await openNote();

    await screen.press('Baixar PDF');

    expect(screen.has('PDF salvo')).toBe(false);
    expect(screen.has('Não foi possível baixar')).toBe(false);
  });

  it('asks for a connection after losing it', async () => {
    download.mockRejectedValue(NETWORK_DOWN);
    const screen = await openNote();

    await screen.press('Baixar PDF');

    expect(screen.has('Não foi possível baixar o PDF.')).toBe(true);
    expect(screen.has('O download exige conexão com a internet.')).toBe(true);
    expect(screen.isDisabled('Baixar PDF')).toBe(true);
  });

  it('only waits for the connection while there is none', async () => {
    jest.mocked(isOnline).mockResolvedValue(false);

    const screen = await openNote();

    expect(screen.isDisabled('Baixar PDF')).toBe(true);
  });
});

describe('deleting a note', () => {
  it('deletes it and goes back', async () => {
    const screen = await openNote();

    await screen.press('Excluir');
    expect(screen.has('Lançamento financeiro vinculado')).toBe(true);
    await screen.press('Excluir permanentemente');
    expect(screen.has('Nota fiscal excluída com sucesso')).toBe(true);
    await screen.press('Entendi');

    expect(deleteConfirmedServiceInvoice).toHaveBeenCalledWith(
      'token',
      'note-1',
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says when the deletion only goes later', async () => {
    jest.mocked(deleteConfirmedServiceInvoice).mockRejectedValue(NETWORK_DOWN);
    const screen = await openNote();

    await screen.press('Excluir');
    await screen.press('Excluir permanentemente');

    expect(screen.has('a exclusão será enviada quando a conexão voltar')).toBe(
      true,
    );
  });

  it('keeps asking when it fails', async () => {
    jest
      .mocked(deleteConfirmedServiceInvoice)
      .mockRejectedValue(new ApiError('broke', null, 500));
    const screen = await openNote();

    await screen.press('Excluir');
    await screen.press('Excluir permanentemente');

    expect(screen.has('Não foi possível excluir a nota.')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('correcting a note', () => {
  const correct = jest.mocked(correctServiceInvoice);

  async function openCorrection() {
    const screen = await openNote();
    await screen.press('Corrigir');
    expect(screen.has('Corrigir nota')).toBe(true);
    return screen;
  }

  it('sends the corrected fields and goes back to the note', async () => {
    correct.mockResolvedValue({ ...RECORD, amount: 200 });
    const screen = await openCorrection();
    expect(screen.valueOf('Data de emissão')).toBe('20/10/2026');

    await screen.type('Valor total', '20000');
    await screen.type('Cidade, UF', '  ');
    await screen.press('Confirmar correção');

    expect(correct).toHaveBeenCalledWith('token', 'note-1', {
      issueDate: '2026-10-20',
      amount: 200,
      clientId: 'client-1',
      location: null,
    });
    expect(screen.has('Detalhes da nota')).toBe(true);
  });

  it('points at the field that is wrong and sends nothing', async () => {
    const screen = await openCorrection();

    await screen.type('Valor total', '');
    await screen.press('Confirmar correção');

    expect(correct).not.toHaveBeenCalled();
    expect(screen.has('Corrigir nota')).toBe(true);
  });

  it.each([
    [NETWORK_DOWN, 'Sem conexão. Conecte-se à internet'],
    [
      new ApiError('x', 'CLIENT_NOT_FOUND', 404),
      'Esse tomador não foi encontrado.',
    ],
    [
      new ApiError('x', 'SERVICE_INVOICE_NOT_FOUND', 404),
      'Esta nota não existe mais.',
    ],
    [new ApiError('x', null, 500), 'Não foi possível salvar a correção.'],
  ])('explains why it could not be saved: %s', async (failure, message) => {
    correct.mockRejectedValue(failure);
    const screen = await openCorrection();

    await screen.press('Confirmar correção');

    expect(screen.has(message)).toBe(true);
    expect(screen.isDisabled('Confirmar correção')).toBe(false);
  });

  it('leaves at once when nothing changed', async () => {
    const screen = await openCorrection();

    await screen.press('Cancelar');

    expect(screen.has('Detalhes da nota')).toBe(true);
  });

  it('asks before losing what was changed', async () => {
    const screen = await openCorrection();
    await screen.type('Cidade, UF', 'Canoas, RS');

    await screen.press('Cancelar');
    expect(screen.has('Sair da correção?')).toBe(true);
    await screen.press('Continuar editando');
    expect(screen.valueOf('Cidade, UF')).toBe('Canoas, RS');

    await screen.press('Cancelar');
    await screen.press('Sair sem salvar');
    expect(screen.has('Detalhes da nota')).toBe(true);
    expect(correct).not.toHaveBeenCalled();
  });
});

describe('the list of notes', () => {
  const openList = () =>
    renderScreen(
      <ServiceInvoicesFlow open onClose={onClose} upload={upload} />,
    );

  it('opens a note and comes back to the list', async () => {
    const screen = await openList();
    expect(screen.has('Nota Fiscal 10')).toBe(true);
    expect(screen.has('Tomador: VetSul')).toBe(true);

    const row = screen.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.title === 'Nota Fiscal 10',
    )[0];
    await screen.act(() => row.props.onPress());
    expect(screen.has('Detalhes da nota')).toBe(true);

    await screen.press('Voltar');
    expect(screen.has('Nota Fiscal 10')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await screen.press('Voltar');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters by situation', async () => {
    const screen = await openList();

    await screen.press('Com erro');

    expect(screen.has('Nada encontrado')).toBe(true);
  });

  it('names a note without a number and starts an upload', async () => {
    fetchList.mockResolvedValue({
      items: [{ ...RECORD, number: null, clientName: '', hasFile: false }],
      total: 1,
    });

    const screen = await openList();
    expect(screen.has('Nota fiscal')).toBe(true);
    // The name comes from the clients of the device when the note has none.
    expect(screen.has('Tomador: VetSul')).toBe(true);

    await screen.press('Adicionar nota');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('shows nothing once closed', async () => {
    const screen = await openList();

    await screen.update(
      <ServiceInvoicesFlow open={false} onClose={onClose} upload={upload} />,
    );

    expect(fetchRecord).not.toHaveBeenCalled();
  });
});

describe('the latest notes of the reports tab', () => {
  const onOpenInvoice = jest.fn();
  const onSeeAll = jest.fn();
  const openSection = () =>
    renderScreen(
      <ServiceInvoicesSection
        onSeeAll={onSeeAll}
        onOpenInvoice={onOpenInvoice}
      />,
    );

  it('shows at most five and opens the one pressed', async () => {
    fetchList.mockResolvedValue({
      items: Array.from({ length: 7 }, (_, index) => ({
        ...RECORD,
        id: `note-${index}`,
        issueDate: `2026-10-0${index + 1}`,
      })),
      total: 7,
    });

    const screen = await openSection();

    expect(screen.has('07/10/2026')).toBe(true);
    expect(screen.has('02/10/2026')).toBe(false);
    await screen.press('VetSul, 07/10/2026');
    expect(onOpenInvoice).toHaveBeenCalledWith('note-6');
  });

  it('says when there is none', async () => {
    fetchList.mockResolvedValue({ items: [], total: 0 });

    expect((await openSection()).has('Nenhuma nota fiscal registrada.')).toBe(
      true,
    );
  });

  it('can be loaded again after a failure', async () => {
    fetchList.mockRejectedValueOnce(new ApiError('broke', null, 500));
    const screen = await openSection();

    await screen.press(
      'Não foi possível carregar as notas fiscais. Tentar novamente',
    );

    expect(screen.has('VetSul')).toBe(true);
  });
});

import { FlatList } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { fetchClients } from 'features/clients';
import { I18nProvider } from 'shared/i18n';

import { DiaDiaScreen } from './DiaDiaScreen';
import { buildAppointment } from '../domain/appointment.fixture';
import type { AppointmentResult } from '../domain/procedure.types';
import {
  fetchAppointments,
  updateAppointment,
} from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  fetchAppointments: jest.fn(),
  createAppointment: jest.fn(),
  updateAppointment: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
  createClient: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchAppointmentsMock = fetchAppointments as jest.MockedFunction<
  typeof fetchAppointments
>;
const updateAppointmentMock = updateAppointment as jest.MockedFunction<
  typeof updateAppointment
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

const NBSP = ' ';

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <DiaDiaScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  // O VirtualizedList renderiza o resto da lista em lotes, por timer.
  await settleListBatches();

  return renderer;
}

async function settleListBatches() {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function pressByLabel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    )[0]
    .props.onPress();
}

function pressCard(
  renderer: ReactTestRenderer.ReactTestRenderer,
  procedureName: string,
) {
  return renderer.root
    .findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityRole === 'button' &&
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes(procedureName),
    )
    .at(-1)!
    .props.onPress();
}

function page(count: number, firstId = 1): AppointmentResult[] {
  return Array.from({ length: count }, (_, index) =>
    buildAppointment({
      id: `appointment-${firstId + index}`,
      procedureName: `Procedimento ${firstId + index}`,
    }),
  );
}

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  fetchAppointmentsMock.mockResolvedValue([]);
  fetchClientsMock.mockResolvedValue([]);
  updateAppointmentMock.mockResolvedValue({} as never);
});

test('lista o atendimento com procedimento, paciente, tomador, data e valor', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  fetchClientsMock.mockResolvedValue([
    { id: 'client-1', name: 'Clínica VetCenter' },
  ] as never);

  const renderer = await renderScreen();

  const rendered = texts(renderer);
  expect(rendered).toContain('Orquiectomia');
  expect(rendered).toContain('Rex');
  expect(rendered).toContain('Clínica VetCenter');
  expect(rendered).toContain('6 ago');
  expect(rendered).toContain('Canino');
  expect(rendered).toContain('ASA I');
  expect(rendered).toContain(`R$${NBSP}350,00`);
});

test.each([
  ['FELINE', 'Felino'],
  ['CANINE', 'Canino'],
  ['OTHER', 'Outro'],
] as const)(
  'espécie %s aparece por extenso como "%s"',
  async (species, label) => {
    fetchAppointmentsMock.mockResolvedValue([buildAppointment({ species })]);

    const renderer = await renderScreen();

    expect(texts(renderer)).toContain(label);
  },
);

test('registro antigo sem espécie nem ASA renderiza sem selo e sem erro', async () => {
  fetchAppointmentsMock.mockResolvedValue([
    buildAppointment({ species: null, asa: null }),
  ]);

  const renderer = await renderScreen();

  const rendered = texts(renderer);
  expect(rendered).toContain('Rex');
  expect(rendered).not.toContain('Canino');
  expect(rendered).not.toContain('ASA I');
  expect(rendered).not.toMatch(/ASA/);
});

test('ASA gravado como "ASA II" por outro cliente não vira "ASA ASA II"', async () => {
  fetchAppointmentsMock.mockResolvedValue([
    buildAppointment({ asa: 'ASA II' }),
  ]);

  const renderer = await renderScreen();

  expect(texts(renderer)).toContain('ASA II');
  expect(texts(renderer)).not.toContain('ASA ASA II');
});

test('mostra "Local não informado" quando não há tomador nem location', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);

  const renderer = await renderScreen();

  expect(texts(renderer)).toContain('Local não informado');
});

test('usa o location antigo dos registros anteriores ao clientId', async () => {
  fetchAppointmentsMock.mockResolvedValue([
    buildAppointment({ clientId: null, location: 'Clínica Antiga' }),
  ]);

  const renderer = await renderScreen();

  expect(texts(renderer)).toContain('Clínica Antiga');
});

test('sem nenhum atendimento mostra a mensagem de lista vazia', async () => {
  const renderer = await renderScreen();

  expect(texts(renderer)).toContain('Nenhum atendimento registrado.');
});

test('vazio com período escolhido mostra a mensagem do filtro', async () => {
  const renderer = await renderScreen();

  await act(async () => {
    renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityState?.expanded === false,
      )[0]
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findAll(node => node.props.testID === '2026-09-10')[0]
      .props.onPress();
  });
  await act(async () => {
    renderer.root
      .findAll(node => node.props.testID === '2026-09-10')[0]
      .props.onPress();
  });

  const rendered = texts(renderer);
  expect(rendered).toContain('Nenhum atendimento encontrado para o período.');
  expect(rendered).not.toContain('Nenhum atendimento registrado.');
});

test('falha na carga mostra o erro e "Tentar novamente" recarrega', async () => {
  fetchAppointmentsMock.mockRejectedValueOnce(new Error('rede'));
  const renderer = await renderScreen();
  expect(texts(renderer)).toContain(
    'Não foi possível carregar os atendimentos.',
  );

  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          JSON.stringify(
            node.findAllByType('Text' as never).map(t => t.props.children),
          ).includes('Tentar novamente'),
      )
      .at(-1)!
      .props.onPress();
  });

  expect(texts(renderer)).toContain('Orquiectomia');
});

test('chegar ao fim da lista cheia carrega a próxima página', async () => {
  fetchAppointmentsMock.mockResolvedValueOnce(page(20));
  const renderer = await renderScreen();
  fetchAppointmentsMock.mockResolvedValueOnce(page(2, 21));

  await act(async () => {
    renderer.root.findByType(FlatList).props.onEndReached();
  });

  expect(fetchAppointmentsMock).toHaveBeenLastCalledWith(
    'id-token',
    expect.objectContaining({ page: 2, pageSize: 20 }),
  );
  await settleListBatches();
  const { data } = renderer.root.findByType(FlatList).props;
  expect(data).toHaveLength(22);
  expect(data.at(-1).procedureName).toBe('Procedimento 22');
});

test('o botão + abre o formulário de novo atendimento', async () => {
  const renderer = await renderScreen();
  expect(texts(renderer)).not.toContain('Confirmar');

  await act(async () => pressByLabel(renderer, 'Novo atendimento'));

  const rendered = texts(renderer);
  expect(rendered).toContain('Novo atendimento');
  expect(rendered).toContain('Confirmar');
  expect(rendered).not.toContain('Editar atendimento');
});

test('tocar num atendimento abre o formulário de edição já preenchido', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  fetchClientsMock.mockResolvedValue([
    { id: 'client-1', name: 'Clínica VetCenter' },
  ] as never);
  const renderer = await renderScreen();

  await act(async () => pressCard(renderer, 'Orquiectomia'));

  expect(texts(renderer)).toContain('Editar atendimento');
  const inputs = renderer.root
    .findAllByType('TextInput' as never)
    .map(node => node.props.value);
  expect(inputs).toEqual(
    expect.arrayContaining(['Rex', 'Orquiectomia', 'Clínica VetCenter']),
  );
});

test('salvar a edição faz PATCH e recarrega a lista', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  fetchClientsMock.mockResolvedValue([
    { id: 'client-1', name: 'Clínica VetCenter' },
  ] as never);
  const renderer = await renderScreen();
  await act(async () => pressCard(renderer, 'Orquiectomia'));
  fetchAppointmentsMock.mockClear();

  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          JSON.stringify(
            node.findAllByType('Text' as never).map(t => t.props.children),
          ).includes('Confirmar'),
      )
      .at(-1)!
      .props.onPress();
  });

  expect(updateAppointmentMock).toHaveBeenCalledWith(
    'id-token',
    'appointment-1',
    expect.objectContaining({ patientName: 'Rex', clientId: 'client-1' }),
  );
  expect(fetchAppointmentsMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({ page: 1 }),
  );
});

test('o + depois de uma edição volta ao título de novo atendimento', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  const renderer = await renderScreen();
  await act(async () => pressCard(renderer, 'Orquiectomia'));

  await act(async () => pressByLabel(renderer, 'Novo atendimento'));

  const rendered = texts(renderer);
  expect(rendered).not.toContain('Editar atendimento');
  expect(
    renderer.root.findAllByType('TextInput' as never).map(n => n.props.value),
  ).not.toContain('Rex');
});

test('o + depois de salvar uma edição abre um cadastro novo, vazio e sem tomador', async () => {
  fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
  fetchClientsMock.mockResolvedValue([
    { id: 'client-1', name: 'Clínica VetCenter' },
  ] as never);
  const renderer = await renderScreen();
  await act(async () => pressCard(renderer, 'Orquiectomia'));
  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          JSON.stringify(
            node.findAllByType('Text' as never).map(t => t.props.children),
          ).includes('Confirmar'),
      )
      .at(-1)!
      .props.onPress();
  });

  await act(async () => pressByLabel(renderer, 'Novo atendimento'));

  expect(texts(renderer)).not.toContain('Editar atendimento');
  const inputs = renderer.root
    .findAllByType('TextInput' as never)
    .map(node => node.props.value);
  expect(inputs).not.toContain('Rex');
  expect(inputs).not.toContain('Clínica VetCenter');
});

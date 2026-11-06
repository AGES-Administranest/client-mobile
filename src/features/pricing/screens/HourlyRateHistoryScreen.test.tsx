import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { HourlyRateHistoryScreen } from './HourlyRateHistoryScreen';
import { OCTOBER_HOURLY_RATE } from '../domain/hourlyRate.fixture';
import { newestPeriods } from '../domain/hourlyRateHistory.fixture';
import { pricingService } from '../services/pricingService';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('../services/pricingService', () => ({
  pricingService: {
    getHourlyRateHistory: jest.fn(),
    getHourlyRateHistoryMonth: jest.fn(),
  },
}));

const getHistory = pricingService.getHourlyRateHistory as jest.Mock;
const getMonth = pricingService.getHourlyRateHistoryMonth as jest.Mock;

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

const NOW = new Date(2026, 9, 19, 17, 42);
// Currency comes with a no-break space after "R$".
const nbsp = (value: string) => value.replace(/R\$ /g, 'R$\u00a0');

async function renderScreen(onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <HourlyRateHistoryScreen visible onClose={onClose} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  const texts = () =>
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children)
      .flat()
      .map(String);
  const control = (label: string) =>
    renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label ||
          node
            .findAllByType('Text' as never)
            .some(text => text.props.children === label)),
    );
  const press = async (label: string) => {
    await act(async () => control(label).props.onPress());
  };
  // A month row, found by the month it starts with.
  const row = (month: string) =>
    renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        String(node.props.accessibilityLabel ?? '').startsWith(`${month},`),
    );
  const selectedRows = () =>
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityState?.selected === true,
      )
      .map(node => String(node.props.accessibilityLabel).split(',')[0]);
  const rowTexts = () =>
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          typeof node.props.accessibilityState?.selected === 'boolean',
      )
      .map(node => String(node.props.accessibilityLabel).split(',')[0]);

  return {
    renderer,
    onClose,
    texts,
    press,
    control,
    row,
    selectedRows,
    rowTexts,
  };
}

beforeEach(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      'nextTick',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'hrtime',
    ],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  getHistory.mockReset().mockResolvedValue(newestPeriods(12));
  getMonth.mockReset().mockResolvedValue(OCTOBER_HOURLY_RATE);
});

describe('states', () => {
  test('asks for the history once, with the id token', async () => {
    await renderScreen();

    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(getHistory).toHaveBeenCalledWith('id-token');
  });

  test('shows a spinner while it loads', async () => {
    getHistory.mockReturnValue(new Promise(() => {}));

    const { renderer, texts } = await renderScreen();

    expect(
      renderer.root.findAll(
        node =>
          node.props.accessibilityLabel ===
          'Carregando o histórico do valor da hora',
      ).length,
    ).toBeGreaterThan(0);
    expect(texts()).toContain('Histórico do valor da hora');
  });

  test('offers a retry when it cannot load', async () => {
    getHistory.mockRejectedValueOnce(new Error('offline'));
    const { texts, press } = await renderScreen();

    expect(texts()).toContain(
      'Não foi possível carregar o histórico do valor da hora.',
    );

    await press('Tentar novamente');

    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(texts()).toContain('Registro mensal');
  });

  test('shows the empty state with no calculation at all', async () => {
    getHistory.mockResolvedValue([]);

    const { texts } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Nenhum cálculo registrado',
        'O valor da sua hora de cada mês passa a aparecer aqui depois do primeiro cálculo.',
      ]),
    );
    expect(texts()).not.toContain('Valor atual da hora');
    expect(texts()).not.toContain('Registro mensal');
  });

  test('the back button closes the screen', async () => {
    const { press, onClose } = await renderScreen();

    await press('Voltar');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('one month', () => {
  beforeEach(() => {
    getHistory.mockResolvedValue(newestPeriods(1));
  });

  test('says it is the first month and has no variation to show', async () => {
    const { texts } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Histórico do valor da hora',
        'Acompanhe como o valor mínimo da sua hora mudou mês a mês',
        'Valor atual da hora',
        '20% de margem',
        nbsp('R$ 98,07'),
        'Primeiro mês calculado: outubro 2026.',
        'Outubro 2026',
        'Mês atual',
        'início do histórico',
      ]),
    );
    expect(texts().join(' ')).not.toContain('vs ');
    expect(texts().join(' ')).not.toContain('Desde o início');
  });

  test('shows the chart placeholder, no period navigator, no note and no link', async () => {
    const { texts, rowTexts, selectedRows } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Evolução',
        'O gráfico aparece no próximo mês',
        'Precisamos de pelo menos 2 meses calculados para mostrar a evolução do valor da sua hora.',
      ]),
    );
    expect(texts().join(' ')).not.toContain('Ver todos');
    expect(texts().join(' ')).not.toContain('O gráfico mostra');
    expect(texts().join(' ')).not.toContain('Com menos de');
    expect(texts()).not.toContain('Últimos 6 meses');
    expect(rowTexts()).toEqual(['Outubro 2026']);
    expect(selectedRows()).toEqual([]);
  });
});

describe('three months', () => {
  beforeEach(() => {
    getHistory.mockResolvedValue(newestPeriods(3));
  });

  test('compares with the previous month and with the start', async () => {
    const { texts } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        '+2,4% vs set.',
        'Desde o início do histórico (ago/2026): ',
        nbsp('+R$ 5,77'),
        ' (+6,3%).',
      ]),
    );
    expect(texts()).not.toContain('Primeiro mês calculado: outubro 2026.');
  });

  test('lists newest first, with the rise or fall of each month', async () => {
    const { texts, rowTexts } = await renderScreen();

    expect(rowTexts()).toEqual([
      'Outubro 2026',
      'Setembro 2026',
      'Agosto 2026',
    ]);
    expect(texts()).toEqual(
      expect.arrayContaining(['+2,4%', '+3,8%', 'início do histórico']),
    );
  });

  test('has no placeholder, no navigator and the short-history note', async () => {
    const { texts } = await renderScreen();

    expect(texts()).not.toContain('O gráfico aparece no próximo mês');
    expect(texts()).toContain(
      'Com menos de 6 meses, o gráfico mostra todos os meses calculados. Novos meses entram aqui no fechamento.',
    );
    expect(texts()).not.toContain('Últimos 6 meses');
    expect(texts().join(' ')).not.toContain('Ver todos');
  });

  test('starts with the newest month selected and follows a tap', async () => {
    const { row, selectedRows } = await renderScreen();

    expect(selectedRows()).toEqual(['Outubro 2026']);

    await act(async () => row('Agosto 2026').props.onPress());

    expect(selectedRows()).toEqual(['Agosto 2026']);
  });
});

describe('six months', () => {
  test('has neither a note nor a way to other windows', async () => {
    getHistory.mockResolvedValue(newestPeriods(6));

    const { texts } = await renderScreen();

    expect(texts().join(' ')).not.toContain('O gráfico mostra');
    expect(texts().join(' ')).not.toContain('Com menos de');
    expect(texts().join(' ')).not.toContain('Ver todos');
    expect(texts()).not.toContain('Últimos 6 meses');
    expect(texts()).toContain('Maio 2026');
  });
});

describe('twelve months', () => {
  test('starts on the latest window, newest first', async () => {
    const { texts, rowTexts, selectedRows } = await renderScreen();

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Mai – Out 2026',
        'Últimos 6 meses',
        'Ver todos os meses (12)',
        'O gráfico mostra até 6 meses por vez. Use as setas acima para ver períodos anteriores.',
        '+2,4% vs set.',
        'Desde o início do histórico (nov/2025): ',
        nbsp('+R$ 17,87'),
        ' (+22,3%).',
      ]),
    );
    expect(rowTexts()).toEqual([
      'Outubro 2026',
      'Setembro 2026',
      'Agosto 2026',
      'Julho 2026',
      'Junho 2026',
      'Maio 2026',
    ]);
    expect(selectedRows()).toEqual(['Outubro 2026']);
    expect(texts()).toContain('−1,4%');
  });

  test('marks only the current month of the calendar', async () => {
    const { texts } = await renderScreen();

    expect(texts().filter(text => text === 'Mês atual')).toHaveLength(1);
  });

  test('the older arrow shows the previous window, even across the year', async () => {
    const { texts, rowTexts, selectedRows, press } = await renderScreen();

    await press('Meses mais antigos');

    expect(texts()).toEqual(
      expect.arrayContaining(['Nov 2025 – Abr 2026', '6 meses anteriores']),
    );
    expect(rowTexts()).toEqual([
      'Abril 2026',
      'Março 2026',
      'Fevereiro 2026',
      'Janeiro 2026',
      'Dezembro 2025',
      'Novembro 2025',
    ]);
    expect(selectedRows()).toEqual(['Abril 2026']);
    expect(texts()).toContain('início do histórico');
    expect(texts()).not.toContain('Mês atual');
  });

  test('the arrows stop at the limits', async () => {
    const { control, press } = await renderScreen();

    expect(control('Meses mais antigos').props.disabled).toBeFalsy();
    expect(control('Meses mais recentes').props.disabled).toBe(true);

    await press('Meses mais antigos');

    expect(control('Meses mais antigos').props.disabled).toBe(true);
    expect(control('Meses mais recentes').props.disabled).toBeFalsy();

    await press('Meses mais recentes');

    expect(control('Meses mais recentes').props.disabled).toBe(true);
  });

  test('selecting a month only highlights it, it does not open anything', async () => {
    const { row, selectedRows, texts } = await renderScreen();

    await act(async () => row('Agosto 2026').props.onPress());

    expect(selectedRows()).toEqual(['Agosto 2026']);
    expect(texts()).toContain('Histórico do valor da hora');
    expect(getHistory).toHaveBeenCalledTimes(1);
  });

  test('changing the window clears the selection', async () => {
    const { row, selectedRows, press } = await renderScreen();
    await act(async () => row('Agosto 2026').props.onPress());

    await press('Meses mais antigos');
    expect(selectedRows()).toEqual(['Abril 2026']);

    await press('Meses mais recentes');
    expect(selectedRows()).toEqual(['Outubro 2026']);
  });

  test('"Todos os meses" lists the whole history by year, from the same data', async () => {
    const { texts, press } = await renderScreen();

    await press('Ver todos os meses (12)');

    expect(texts()).toEqual(
      expect.arrayContaining([
        'Todos os meses',
        '12 meses calculados desde novembro 2025',
        'Desde o início do histórico',
        nbsp('+R$ 17,87'),
        '+22,3%',
        nbsp('De R$ 80,20 em novembro 2025 para R$ 98,07 em outubro 2026.'),
        '2026',
        '10 meses',
        '2025',
        '2 meses',
        'Janeiro 2026',
        'Novembro 2025',
        'início do histórico',
        '−0,8%',
      ]),
    );
    expect(texts()).not.toContain('Registro mensal');
    expect(texts().join(' ')).not.toContain('Toque em um mês');
    expect(getHistory).toHaveBeenCalledTimes(1);
  });

  test('the rows of "Todos os meses" have no action yet', async () => {
    const { press, rowTexts, renderer } = await renderScreen();

    await press('Ver todos os meses (12)');

    expect(rowTexts()).toEqual([]);
    expect(
      renderer.root.findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          String(node.props.accessibilityLabel ?? '').includes('2026,'),
      ),
    ).toEqual([]);
  });

  test('back from "Todos os meses" returns to the history without closing', async () => {
    const { texts, press, onClose } = await renderScreen();
    await press('Meses mais antigos');
    await press('Ver todos os meses (12)');

    await press('Voltar');

    expect(onClose).not.toHaveBeenCalled();
    expect(texts()).toEqual(
      expect.arrayContaining(['Histórico do valor da hora', 'Registro mensal']),
    );
    expect(getHistory).toHaveBeenCalledTimes(1);

    await press('Voltar');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

test('a drop smaller than a tenth reads as flat, not as "−0,0%"', async () => {
  const [newest, previous] = newestPeriods(2);
  getHistory.mockResolvedValue([
    { ...newest, hourlyRate: previous.hourlyRate + 0.01 },
    previous,
  ]);

  const { texts } = await renderScreen();

  expect(texts()).toContain('0,0%');
  expect(texts().join(' ')).not.toContain('−0,0%');
});

test('asks for the detail of the newest month only, to read the margin', async () => {
  const { texts } = await renderScreen();

  expect(getMonth).toHaveBeenCalledTimes(1);
  expect(getMonth).toHaveBeenCalledWith('id-token', { month: 10, year: 2026 });
  expect(texts()).toContain('20% de margem');
});

test('keeps the history without the margin chip when the detail fails', async () => {
  getMonth.mockRejectedValue(new Error('offline'));

  const { texts } = await renderScreen();

  expect(texts()).toEqual(
    expect.arrayContaining(['Valor atual da hora', nbsp('R$ 98,07')]),
  );
  expect(texts().join(' ')).not.toContain('de margem');
  expect(texts().join(' ')).not.toContain('Não foi possível');
});

test('keeps the history without the margin chip when the month has no detail', async () => {
  getMonth.mockResolvedValue(null);

  const { texts } = await renderScreen();

  expect(texts()).toContain(nbsp('R$ 98,07'));
  expect(texts().join(' ')).not.toContain('de margem');
});

test('does not ask for a detail when there is no month', async () => {
  getHistory.mockResolvedValue([]);

  await renderScreen();

  expect(getMonth).not.toHaveBeenCalled();
});

import type { useTranslation } from 'shared/i18n';
import enUS from 'shared/i18n/locales/en-US.json';
import ptBR from 'shared/i18n/locales/pt-BR.json';
import { translate } from 'shared/i18n/translate';

import {
  historyPeriodLabel,
  historyRowView,
  historyShowMoreLabel,
  historyTotalsView,
} from './clinicHistoryPresenter';
import type { ClientAppointment } from '../domain/clientHistory';

type Translate = ReturnType<typeof useTranslation>['t'];

const tPt: Translate = (key, params) => translate(ptBR, key, params);
const tEn: Translate = (key, params) => translate(enUS, key, params);

const LOCALES = [
  ['pt-BR', tPt],
  ['en-US', tEn],
] as const;

const APPOINTMENT: ClientAppointment = {
  id: 'appointment-1',
  startsAt: '2026-11-03T16:00:00.000Z',
  procedureName: 'Orquiectomia',
  patientName: 'Mel',
  amount: 620,
};

function plain(text: string | null) {
  return text?.replace(/\s/g, ' ') ?? null;
}

describe('historyRowView', () => {
  it.each([
    ['pt-BR', 'Mel · 03 nov', 'R$ 620'],
    ['en-US', 'Mel · Nov 03', 'R$620'],
  ] as const)(
    'shows the procedure, patient, day and amount in %s',
    (locale, detail, amount) => {
      const t = locale === 'pt-BR' ? tPt : tEn;
      const row = historyRowView(APPOINTMENT, t, locale);

      expect(row.title).toBe('Orquiectomia');
      expect(row.detail).toBe(detail);
      expect(plain(row.amount)).toBe(amount);
    },
  );

  it.each([
    [0, 'R$ 0'],
    [96.5, 'R$ 96,50'],
    [null, 'Sem valor'],
  ])('shows the amount %p as %p', (amount, expected) => {
    const row = historyRowView({ ...APPOINTMENT, amount }, tPt, 'pt-BR');

    expect(plain(row.amount)).toBe(expected);
  });

  it.each(LOCALES)(
    'fills in a missing procedure and patient in %s',
    (locale, t) => {
      const row = historyRowView(
        { ...APPOINTMENT, procedureName: null, patientName: null },
        t,
        locale,
      );

      expect(row.title).toBe(t('clinics.history.noProcedure'));
      expect(row.detail).toBe(locale === 'pt-BR' ? '03 nov' : 'Nov 03');
    },
  );
});

describe('historyTotalsView', () => {
  it.each([
    ['pt-BR', 0, 'Nenhum trecho no período'],
    ['pt-BR', 1, '1 trecho no período'],
    ['pt-BR', 3, '3 trechos no período'],
    ['en-US', 0, 'No trips in the period'],
    ['en-US', 1, '1 trip in the period'],
    ['en-US', 3, '3 trips in the period'],
  ] as const)('labels %s trips %p as %p', (locale, tripCount, expected) => {
    const t = locale === 'pt-BR' ? tPt : tEn;
    const totals = historyTotalsView(
      { appointmentsCount: 6, billedTotal: 3420, tripCost: 96.5, tripCount },
      t,
      locale,
    );

    expect(totals.tripCount).toBe(expected);
  });

  it.each([
    ['pt-BR', 'R$ 3.420', '1.234', 'R$ 96,50'],
    ['en-US', 'R$3,420', '1,234', 'R$96.50'],
  ] as const)(
    'formats the totals in %s',
    (locale, billed, appointments, tripCost) => {
      const t = locale === 'pt-BR' ? tPt : tEn;
      const totals = historyTotalsView(
        {
          appointmentsCount: 1234,
          billedTotal: 3420,
          tripCost: 96.5,
          tripCount: 2,
        },
        t,
        locale,
      );

      expect(plain(totals.billed)).toBe(billed);
      expect(totals.appointments).toBe(appointments);
      expect(plain(totals.tripCost)).toBe(tripCost);
    },
  );
});

describe('historyShowMoreLabel', () => {
  it.each([
    ['pt-BR', false, 0, false, null],
    ['pt-BR', true, 1, false, 'Ver mais 1 atendimento'],
    ['pt-BR', true, 3, false, 'Ver mais 3 atendimentos'],
    [
      'pt-BR',
      true,
      3,
      true,
      'Não foi possível carregar mais atendimentos. Tentar novamente',
    ],
    ['en-US', true, 1, false, 'Show 1 more appointment'],
    ['en-US', true, 3, false, 'Show 3 more appointments'],
  ] as const)(
    'labels %s with more pages %p, %p left and failed %p as %p',
    (locale, hasMore, remaining, loadMoreFailed, expected) => {
      const t = locale === 'pt-BR' ? tPt : tEn;

      expect(
        historyShowMoreLabel({ hasMore, remaining, loadMoreFailed }, t, locale),
      ).toBe(expected);
    },
  );
});

describe('historyPeriodLabel', () => {
  it.each([
    [
      'pt-BR',
      { from: '2026-11-01', to: '2026-11-30' },
      '01/11/2026 – 30/11/2026',
    ],
    [
      'en-US',
      { from: '2026-11-01', to: '2026-11-30' },
      '11/01/2026 – 11/30/2026',
    ],
    ['pt-BR', { from: '2026-11-01', to: null }, '01/11/2026'],
    ['pt-BR', { from: null, to: null }, ''],
  ] as const)('shows the %s range %p as %p', (locale, range, expected) => {
    const t = locale === 'pt-BR' ? tPt : tEn;

    expect(historyPeriodLabel(range, t, locale)).toBe(expected);
  });
});

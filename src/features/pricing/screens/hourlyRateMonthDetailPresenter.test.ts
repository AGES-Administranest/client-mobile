import { locales, type Locale } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';

import { goalsView } from './hourlyRateMonthDetailPresenter';
import {
  hourlyRateBreakdownRows,
  hourlyRateHighlightView,
} from './hourlyRatePresenter';
import { SEPTEMBER_HOURLY_RATE } from '../domain/hourlyRate.fixture';

const formatFor = (locale: Locale) => ({
  locale,
  t: ((key, params) => translate(locales[locale], key, params)) as Parameters<
    typeof goalsView
  >[1]['t'],
});

// Currency comes with a no-break space after the symbol.
const plain = (value: string) => value.replace(/ /g, ' ');

// September as it was stored: other goals than the calculator's current ones.
const SEPTEMBER = {
  ...SEPTEMBER_HOURLY_RATE,
  settings: { monthlyIncomeGoal: 7500, weeklyHours: 25, safetyMarginPct: 15.5 },
  // A local time, so the date it is shown on is the same in any time zone.
  calculatedAt: new Date(2026, 9, 19, 17, 42).toISOString(),
};

describe('goalsView', () => {
  it('shows the goals the month used, not the current ones, as the Figma card', () => {
    const view = goalsView(SEPTEMBER, formatFor('pt-BR'));

    expect(view.title).toBe('Metas');
    expect(view.rows).toEqual([
      { label: 'Meta de renda líquida mensal (R$)', value: '7500' },
      { label: 'Horas disponíveis por semana', value: '25' },
      { label: 'Margem de segurança (%)', value: '15,5' },
    ]);
  });

  it('writes no thousands separator, as the Figma values (8000)', () => {
    const view = goalsView(
      {
        ...SEPTEMBER,
        settings: { ...SEPTEMBER.settings, monthlyIncomeGoal: 12345.5 },
      },
      formatFor('pt-BR'),
    );

    expect(view.rows[0].value).toBe('12345,5');
  });

  it('reuses the calculator labels in the other locale too', () => {
    const view = goalsView(SEPTEMBER, formatFor('en-US'));

    expect(view.title).toBe(
      translate(locales['en-US'], 'pricing.goalForm.title'),
    );
    const labels = locales['en-US'].pricing.goalForm.labels;
    expect(view.rows.map(row => row.label)).toEqual([
      labels.monthlyIncomeGoal,
      labels.weeklyHours,
      labels.safetyMarginPct,
    ]);
  });
});

describe('what the snapshot gives the shared cards', () => {
  it('turns the stored month into the highlight texts', () => {
    const view = hourlyRateHighlightView(SEPTEMBER, formatFor('pt-BR'));

    expect(view.marginLabel).toBe('15,5% de margem');
    expect(plain(view.value)).toBe('R$ 95,81');
    expect(plain(view.minimum.value)).toBe('R$ 79,84');
    expect(view.productiveHours.value).toBe('130 h');
    expect(view.updatedAt).toBe('Atualizado em 19/10/2026 às 17:42');
  });

  it('turns the four stored parts into rows whose shares add up to 100', () => {
    const rows = hourlyRateBreakdownRows(SEPTEMBER, formatFor('pt-BR'));

    expect(rows.map(row => row.label)).toEqual([
      'Custos fixos',
      'Custos variáveis',
      'Pró-labore',
      'Margem de segurança',
    ]);
    expect(rows.map(row => plain(row.value))).toEqual([
      'R$ 1.399,08',
      'R$ 980,00',
      'R$ 8.000,00',
      'R$ 2.075,82',
    ]);
    expect(rows[3].caption).toBe('15,5% sobre custos + pró-labore');
    const shares = rows.map(row =>
      Number(row.shareLabel.replace('% do total', '').replace(',', '.')),
    );
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(100, 5);
  });
});

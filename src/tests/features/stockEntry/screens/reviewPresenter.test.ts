import type { Review, ReviewLine } from 'features/stockEntry/domain/review';
import {
  attentionView,
  moneyFromInput,
  quantityFromInput,
  reviewLineView,
  sumView,
  type Formatters,
} from 'features/stockEntry/screens/reviewPresenter';
import { locales } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';
import { formatCurrency } from 'shared/utils/currency';

const format: Formatters = {
  t: (key, params) => translate(locales['pt-BR'], key, params),
  money: value => formatCurrency(value, 'pt-BR'),
  number: value => value.toLocaleString('pt-BR'),
};

const LINE: ReviewLine = {
  id: 'line-0',
  sourceIndex: 0,
  description: 'CLORIDRATO DE CETAMINA 10ML',
  quantity: 12,
  unitValue: 8.4,
  printedTotal: null,
  link: { itemId: 'cetamina', name: 'Cetamina 10 mL', unit: 'frasco' },
  candidates: [],
  lot: '',
  expiry: '',
};

// Spaces in the currency format are non-breaking; compare them as plain ones.
const plain = (text: string | undefined) => text?.replace(/\s/g, ' ');

describe('reviewLineView', () => {
  it('shows the quantity in the unit of the linked item', () => {
    const view = reviewLineView(LINE, [LINE], format);

    expect(view.shown.quantity).toEqual({ text: '12 frasco', missing: false });
    expect(plain(view.shown.total.text)).toBe('R$ 100,80');
    expect(view.issue).toBeUndefined();
  });

  it('explains a total that disagrees and offers the computed one', () => {
    const line = { ...LINE, printedTotal: 118 };
    const { issue, shown } = reviewLineView(line, [line], format);

    expect(issue?.kind).toBe('mismatch');
    expect(issue?.blocking).toBe(true);
    expect(plain(issue?.message)).toBe(
      '12 × R$ 8,40 dá R$ 100,80. A nota traz R$ 118,00.',
    );
    expect(plain(issue?.fixLabel)).toBe('Usar R$ 100,80');
    expect(shown.total.missing).toBe(true);
  });

  it('asks for what the document left out', () => {
    const line = { ...LINE, quantity: null, unitValue: null };
    const view = reviewLineView(line, [line], format);

    expect(view.shown.quantity).toEqual({ text: 'informar', missing: true });
    expect(view.issue?.kind).toBe('noQuantity');
    expect(view.issue?.blocking).toBe(false);
  });

  it('labels the lots of a split line', () => {
    const second = { ...LINE, id: 'split-1' };

    expect(reviewLineView(second, [LINE, second], format).splitLabel).toBe(
      'Dividida · lote 2 de 2',
    );
  });
});

describe('attentionView', () => {
  it.each([
    [0, false, 'Tudo conferido', undefined],
    [1, false, '1 linha precisa de atenção', 'Ver só essas'],
    [3, true, '3 linhas precisam de atenção', 'Ver todas'],
  ])('%i lines, filtered %p', (count, onlyAttention, label, actionLabel) => {
    expect(attentionView(count, onlyAttention, format.t)).toEqual({
      label,
      ...(actionLabel && { actionLabel }),
    });
  });
});

describe('sumView', () => {
  const review = (totalAmount: number | null): Review => ({
    header: {
      supplierId: null,
      supplierName: null,
      invoiceNumber: '',
      orderDate: '',
      totalAmount,
    },
    lines: [LINE],
    partial: null,
  });

  it('points out a difference to the document total', () => {
    const sum = sumView(review(118), format);

    expect(sum.isOff).toBe(true);
    expect(plain(sum.label)).toBe(
      'Soma das linhas: R$ 100,80 · diferença de R$ 17,20',
    );
  });

  it('only sums when the total matches or was not read', () => {
    expect(sumView(review(100.8), format).isOff).toBe(false);
    expect(sumView(review(null), format).isOff).toBe(false);
  });
});

describe('typed values', () => {
  it.each([
    ['4', 4],
    ['4a', 4],
    ['', null],
  ])('quantity %p → %p', (text, expected) => {
    expect(quantityFromInput(text)).toBe(expected);
  });

  it.each([
    ['2250', 22.5],
    ['22,50', 22.5],
    ['', null],
  ])('money %p → %p', (text, expected) => {
    expect(moneyFromInput(text)).toBe(expected);
  });
});

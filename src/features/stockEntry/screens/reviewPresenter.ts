import {
  currencyToNumber,
  digitsOnly,
  formatCurrency as maskCurrency,
} from 'app/components/ui/item-modal/domain/itemModal';
import type { TranslationKey, useTranslation } from 'shared/i18n';

import type { ReviewLineLabels } from '../components/ReviewLineCard';
import {
  BLOCKING_ISSUES,
  lineIssue,
  lineTotal,
  linesSum,
  splitPosition,
  totalDifference,
  type LineIssue,
  type Review,
  type ReviewLine,
} from '../domain/review';
import type { SaveStatus } from '../hooks/useDraftAutosave';

type Translate = ReturnType<typeof useTranslation>['t'];

export type Formatters = {
  t: Translate;
  money: (value: number) => string;
  number: (value: number) => string;
};

type Shown = { text: string; missing?: boolean };

export type ReviewLineView = {
  description: string;
  splitLabel?: string;
  linkName: string | null;
  shown: Record<'quantity' | 'unitValue' | 'total' | 'lot' | 'expiry', Shown>;
  inputs: Record<'quantity' | 'unit' | 'unitValue' | 'lot' | 'expiry', string>;
  issue?: {
    kind: LineIssue;
    blocking: boolean;
    message: string;
    fixLabel: string;
  };
};

const ISSUE_KEYS: Record<
  LineIssue,
  { message: TranslationKey; fix: TranslationKey }
> = {
  mismatch: {
    message: 'stockEntry.review.line.issues.mismatch',
    fix: 'stockEntry.review.line.fixes.mismatch',
  },
  shortName: {
    message: 'stockEntry.review.line.issues.shortName',
    fix: 'stockEntry.review.line.fixes.shortName',
  },
  unlinked: {
    message: 'stockEntry.review.line.issues.unlinked',
    fix: 'stockEntry.review.line.fixes.unlinked',
  },
  noQuantity: {
    message: 'stockEntry.review.line.issues.noQuantity',
    fix: 'stockEntry.review.line.fixes.noQuantity',
  },
  noUnitValue: {
    message: 'stockEntry.review.line.issues.noUnitValue',
    fix: 'stockEntry.review.line.fixes.noUnitValue',
  },
};

const SAVE_KEYS: Record<SaveStatus, TranslationKey> = {
  idle: 'stockEntry.review.save.idle',
  saving: 'stockEntry.review.save.saving',
  saved: 'stockEntry.review.save.saved',
  failed: 'stockEntry.review.save.failed',
};

export function reviewLineView(
  line: ReviewLine,
  lines: readonly ReviewLine[],
  format: Formatters,
): ReviewLineView {
  const { t, money, number } = format;
  const total = lineTotal(line);
  const unit = line.link?.unit ?? '';
  const split = splitPosition(lines, line);
  const missing = { text: t('stockEntry.review.line.missing'), missing: true };

  return {
    description: line.description || t('stockEntry.review.line.addedByHand'),
    ...(split && { splitLabel: t('stockEntry.review.line.split', split) }),
    linkName: line.link
      ? line.link.name || t('stockEntry.review.line.linkedWithoutName')
      : null,
    shown: {
      quantity:
        line.quantity === null
          ? missing
          : {
              text: `${number(line.quantity)} ${unit}`.trim(),
              missing: line.quantity <= 0,
            },
      unitValue:
        line.unitValue === null ? missing : { text: money(line.unitValue) },
      total:
        total === null
          ? { text: '—', missing: true }
          : { text: money(total), missing: lineIssue(line) === 'mismatch' },
      lot: { text: line.lot || '—' },
      expiry: { text: line.expiry || '—' },
    },
    inputs: {
      quantity: line.quantity === null ? '' : String(line.quantity),
      unit: unit || '—',
      unitValue: moneyInput(line.unitValue),
      lot: line.lot,
      expiry: line.expiry,
    },
    ...issueView(line, format),
  };
}

function issueView(
  line: ReviewLine,
  { t, money, number }: Formatters,
): Pick<ReviewLineView, 'issue'> {
  const kind = lineIssue(line);
  if (!kind) return {};

  const params = {
    quantity: number(line.quantity ?? 0),
    unitValue: money(line.unitValue ?? 0),
    computed: money(lineTotal(line) ?? 0),
    printed: money(line.printedTotal ?? 0),
    count: line.description.trim().length,
  };
  return {
    issue: {
      kind,
      blocking: BLOCKING_ISSUES.includes(kind),
      message: t(ISSUE_KEYS[kind].message, params),
      fixLabel: t(ISSUE_KEYS[kind].fix, params),
    },
  };
}

export function attentionView(
  count: number,
  onlyAttention: boolean,
  t: Translate,
): { label: string; actionLabel?: string } {
  const label =
    count === 0
      ? t('stockEntry.review.allChecked')
      : count === 1
      ? t('stockEntry.review.attentionOne')
      : t('stockEntry.review.attention', { count });

  if (onlyAttention)
    return { label, actionLabel: t('stockEntry.review.showAll') };
  if (count > 0) {
    return { label, actionLabel: t('stockEntry.review.showOnlyAttention') };
  }
  return { label };
}

export function sumView(
  review: Review,
  { t, money }: Formatters,
): { label: string; isOff: boolean } {
  const sum = money(linesSum(review.lines));
  const difference = totalDifference(review);
  if (difference === null || Math.abs(difference) < 0.01) {
    return { label: t('stockEntry.review.linesSum', { sum }), isOff: false };
  }
  return {
    label: t('stockEntry.review.linesSumDifference', {
      sum,
      difference: money(Math.abs(difference)),
    }),
    isOff: true,
  };
}

export function saveStatusLabel(status: SaveStatus, t: Translate): string {
  return t(SAVE_KEYS[status]);
}

export function moneyInput(value: number | null): string {
  return value === null ? '' : maskCurrency(String(Math.round(value * 100)));
}

export function moneyFromInput(text: string): number | null {
  const masked = maskCurrency(text);
  return masked === '' ? null : currencyToNumber(masked);
}

export function quantityFromInput(text: string): number | null {
  const digits = digitsOnly(text);
  return digits === '' ? null : Number(digits);
}

export function reviewLineLabels(t: Translate): ReviewLineLabels {
  return {
    quantity: t('stockEntry.review.line.quantity'),
    unit: t('stockEntry.review.line.unit'),
    unitValue: t('stockEntry.review.line.unitValue'),
    total: t('stockEntry.review.line.total'),
    lineTotal: t('stockEntry.review.line.lineTotal'),
    lot: t('stockEntry.review.line.lot'),
    expiry: t('stockEntry.review.line.expiry'),
    datePlaceholder: t('stockEntry.review.datePlaceholder'),
    edit: t('stockEntry.review.line.edit'),
    done: t('stockEntry.review.line.done'),
    split: t('stockEntry.review.line.splitAction'),
    remove: t('stockEntry.review.line.remove'),
  };
}

export function reviewHeaderLabels(t: Translate) {
  return {
    supplier: t('stockEntry.review.supplier'),
    invoiceNumber: t('stockEntry.review.invoiceNumber'),
    date: t('stockEntry.review.date'),
    datePlaceholder: t('stockEntry.review.datePlaceholder'),
    total: t('stockEntry.review.total'),
  };
}

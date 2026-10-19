import type { TranslationKey, useTranslation } from 'shared/i18n';

import type { StatusTone } from '../components/EntryCard';
import { toDayMonthYear } from '../domain/dates';
import {
  entryFailure,
  entryStatus,
  type DraftSummary,
  type EntryStatus,
} from '../domain/draft';
import type { ReadingFailure } from '../domain/extraction';

type Translate = ReturnType<typeof useTranslation>['t'];

export type EntryCardView = {
  status: EntryStatus;
  title: string;
  meta: string;
  value?: string;
  statusLabel: string;
  statusTone: StatusTone;
  reason?: string;
};

const STATUS: Record<EntryStatus, { label: TranslationKey; tone: StatusTone }> =
  {
    ready: { label: 'stockEntry.entries.status.ready', tone: 'attention' },
    processing: {
      label: 'stockEntry.entries.status.processing',
      tone: 'neutral',
    },
    failed: { label: 'stockEntry.entries.status.failed', tone: 'alert' },
    photo: { label: 'stockEntry.entries.status.photo', tone: 'muted' },
    notUploaded: {
      label: 'stockEntry.entries.status.notUploaded',
      tone: 'muted',
    },
  };

const FAILURE_REASONS: Record<ReadingFailure, TranslationKey> = {
  photo: 'stockEntry.entries.reasons.photo',
  noTextLayer: 'stockEntry.reading.noTextLayer.title',
  noTableFound: 'stockEntry.reading.noTableFound.title',
  timeout: 'stockEntry.reading.timeout.title',
  unreadable: 'stockEntry.reading.unreadable.title',
};

export function entryCardView(
  draft: DraftSummary,
  t: Translate,
  money: (value: number) => string,
): EntryCardView {
  const status = entryStatus(draft);
  const reason = reasonOf(draft, status);

  return {
    status,
    title:
      draft.supplierName ?? draft.fileName ?? t('stockEntry.entries.untitled'),
    meta: metaOf(draft, t),
    ...(draft.totalAmount !== undefined && { value: money(draft.totalAmount) }),
    statusLabel: t(STATUS[status].label),
    statusTone: STATUS[status].tone,
    ...(reason && { reason: t(reason) }),
  };
}

function reasonOf(
  draft: DraftSummary,
  status: EntryStatus,
): TranslationKey | null {
  if (status === 'photo') return FAILURE_REASONS.photo;
  if (status === 'notUploaded') return 'stockEntry.entries.reasons.notUploaded';
  const failure = entryFailure(draft);
  return failure ? FAILURE_REASONS[failure] : null;
}

function metaOf(draft: DraftSummary, t: Translate): string {
  const kind =
    draft.fileMimeType === 'image/jpeg'
      ? t('stockEntry.entries.photo')
      : t('stockEntry.entries.pdf');
  const number = draft.invoiceNumber
    ? t('stockEntry.entries.invoiceNumber', { number: draft.invoiceNumber })
    : null;
  const date = draft.orderDate ? toDayMonthYear(draft.orderDate) : null;
  return [kind, number, date].filter(Boolean).join(' · ');
}

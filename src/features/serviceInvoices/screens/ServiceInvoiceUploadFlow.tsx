import { Eye } from 'lucide-react-native';
import { View } from 'react-native';

import { LoadingOverlay } from 'app/components/ui/loading-overlay';
import { MessageOverlay } from 'app/components/ui/message-overlay';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { ServiceInvoiceReviewScreen } from './ServiceInvoiceReviewScreen';
import { OfflineNoticeSheet } from '../components/OfflineNoticeSheet';
import { RejectedInvoiceSheet } from '../components/RejectedInvoiceSheet';
import type { FileRefusal } from '../domain/acceptedFile';
import { toDuplicateSummary } from '../domain/duplicateSummary';
import {
  canSendAnyway,
  isKnownRejectionCode,
  type KnownRejectionCode,
} from '../domain/offlineServiceInvoices';
import { usePendingServiceInvoices } from '../hooks/usePendingServiceInvoices';
import type { ServiceInvoiceUploadState } from '../hooks/useServiceInvoiceUpload';

const REJECTION_REASON_KEYS: Record<KnownRejectionCode, TranslationKey> = {
  SERVICE_INVOICE_FILE_DUPLICATED:
    'serviceInvoices.sync.reasons.fileDuplicated',
  SERVICE_INVOICE_FILE_TOO_LARGE: 'serviceInvoices.sync.reasons.fileTooLarge',
  CLIENT_NOT_SYNCED: 'serviceInvoices.sync.reasons.clientNotSynced',
  PENDING_FILE_MISSING: 'serviceInvoices.sync.reasons.fileMissing',
  SERVICE_INVOICE_POSSIBLE_DUPLICATE:
    'serviceInvoices.sync.reasons.possibleDuplicate',
};

const FILE_REFUSAL_KEYS: Record<FileRefusal, TranslationKey> = {
  notPdf: 'serviceInvoices.errors.notPdf',
  tooLarge: 'serviceInvoices.errors.tooLarge',
  alreadySent: 'serviceInvoices.errors.alreadySent',
};

const OTHER_REASON_KEY: TranslationKey = 'serviceInvoices.sync.reasons.other';

function reasonKeyOf(code: string | null): TranslationKey {
  return isKnownRejectionCode(code)
    ? REJECTION_REASON_KEYS[code]
    : OTHER_REASON_KEY;
}

type ServiceInvoiceUploadFlowProps = {
  /** From `useServiceInvoiceUpload`, whose `start` the screen calls. */
  upload: ServiceInvoiceUploadState;
  /** For the screen behind to reload its totals. */
  onInvoiceConfirmed?: () => void;
};

/**
 * Read a PDF, review it: the NFSe counterpart of the stock entry flow, started
 * by the screen that holds `upload`. Without a connection the reading is not
 * available, so the same review is offered for typing the note by hand, to be
 * sent once the connection is back. The notes waiting for that are shown here.
 */
export function ServiceInvoiceUploadFlow({
  upload,
  onInvoiceConfirmed,
}: ServiceInvoiceUploadFlowProps) {
  const { t } = useTranslation();
  const pending = usePendingServiceInvoices();

  const { waiting, rejected } = pending.counts;
  const rejection = pending.rejection;
  const rejectionSummary = rejection
    ? toDuplicateSummary({
        id: rejection.id,
        issueDate: rejection.issueDate,
        amount: rejection.amount,
        clientName: '',
      })
    : null;

  // Without the trigger next to them, an empty box would still take a gap in
  // the screen's column: the notices only get one when there is something to say.
  const hasNotices =
    waiting > 0 ||
    rejected > 0 ||
    pending.discardLeftFile ||
    pending.loadFailed;

  return (
    <>
      {hasNotices ? (
        <View className="gap-3">
          {waiting > 0 ? (
            <NoticeBanner
              tone="info"
              message={t(
                waiting === 1
                  ? 'serviceInvoices.pending.waitingOne'
                  : 'serviceInvoices.pending.waitingOther',
                { count: waiting },
              )}
            />
          ) : null}
          {rejected > 0 ? (
            <NoticeBanner
              tone="alert"
              message={t(
                rejected === 1
                  ? 'serviceInvoices.pending.rejectedOne'
                  : 'serviceInvoices.pending.rejectedOther',
                { count: rejected },
              )}
              actionLabel={t('serviceInvoices.pending.review')}
              actionIcon={Eye}
              actionPlacement="inline"
              onAction={pending.reopenRejection}
            />
          ) : null}
          {pending.discardLeftFile ? (
            <NoticeBanner
              tone="alert"
              message={t('serviceInvoices.pending.discardLeftFile')}
              actionLabel={t('serviceInvoices.sync.dismiss')}
              actionPlacement="inline"
              onAction={pending.dismissDiscardNotice}
            />
          ) : null}
          {pending.loadFailed ? (
            <NoticeBanner
              tone="alert"
              message={t('serviceInvoices.pending.loadFailed')}
            />
          ) : null}
        </View>
      ) : null}

      <LoadingOverlay
        visible={upload.step === 'extracting'}
        label={t('serviceInvoices.extracting')}
      />

      <MessageOverlay
        visible={upload.fileRefusal !== null}
        message={
          upload.fileRefusal ? t(FILE_REFUSAL_KEYS[upload.fileRefusal]) : ''
        }
        actionLabel={t('serviceInvoices.errors.dismiss')}
        onDismiss={upload.dismissFileRefusal}
      />

      <OfflineNoticeSheet
        visible={upload.step === 'offline'}
        title={t('serviceInvoices.offline.title')}
        closeLabel={t('serviceInvoices.offline.close')}
        message={t('serviceInvoices.offline.message')}
        manualLabel={t('serviceInvoices.offline.manual')}
        onManual={upload.chooseManual}
        onClose={upload.dismissOffline}
        onClosed={upload.onOfflineClosed}
      />

      <RejectedInvoiceSheet
        visible={rejection !== null && rejectionSummary !== null}
        title={t('serviceInvoices.sync.title')}
        closeLabel={t('serviceInvoices.sync.keep')}
        message={
          rejectionSummary
            ? t('serviceInvoices.sync.message', {
                date: rejectionSummary.issueDate,
                amount: rejectionSummary.amount,
                reason: t(reasonKeyOf(rejection?.rejection?.code ?? null)),
              })
            : ''
        }
        discardLabel={t('serviceInvoices.sync.discard')}
        keepLabel={t('serviceInvoices.sync.keep')}
        sendAnyway={
          rejection && canSendAnyway(rejection)
            ? {
                label: t('serviceInvoices.sync.sendAnyway'),
                onPress: pending.sendRejectionAnyway,
              }
            : undefined
        }
        onDiscard={pending.discardRejection}
        onKeep={pending.keepRejection}
      />

      {upload.review && upload.invoiceId ? (
        <ServiceInvoiceReviewScreen
          visible={upload.step === 'review'}
          invoiceId={upload.invoiceId}
          initial={upload.review}
          manualFile={upload.manualFile}
          onClose={upload.leaveReview}
          onConfirmed={() => {
            upload.finishReview();
            onInvoiceConfirmed?.();
          }}
        />
      ) : null}
    </>
  );
}

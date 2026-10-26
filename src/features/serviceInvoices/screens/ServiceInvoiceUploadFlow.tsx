import { Eye, Upload } from 'lucide-react-native';
import { View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';
import { LoadingOverlay } from 'app/components/ui/loading-overlay';
import { MessageOverlay } from 'app/components/ui/message-overlay';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { ServiceInvoiceReviewScreen } from './ServiceInvoiceReviewScreen';
import { OfflineNoticeSheet } from '../components/OfflineNoticeSheet';
import { RejectedInvoiceSheet } from '../components/RejectedInvoiceSheet';
import { toDuplicateSummary } from '../domain/duplicateSummary';
import {
  isKnownRejectionCode,
  type KnownRejectionCode,
} from '../domain/offlineServiceInvoices';
import { usePendingServiceInvoices } from '../hooks/usePendingServiceInvoices';
import { useServiceInvoiceUpload } from '../hooks/useServiceInvoiceUpload';

const REJECTION_REASON_KEYS: Record<KnownRejectionCode, TranslationKey> = {
  SERVICE_INVOICE_FILE_DUPLICATED:
    'serviceInvoices.sync.reasons.fileDuplicated',
  SERVICE_INVOICE_FILE_TOO_LARGE: 'serviceInvoices.sync.reasons.fileTooLarge',
  CLIENT_NOT_SYNCED: 'serviceInvoices.sync.reasons.clientNotSynced',
  PENDING_FILE_MISSING: 'serviceInvoices.sync.reasons.fileMissing',
};

const OTHER_REASON_KEY: TranslationKey = 'serviceInvoices.sync.reasons.other';

function reasonKeyOf(code: string | null): TranslationKey {
  return isKnownRejectionCode(code)
    ? REJECTION_REASON_KEYS[code]
    : OTHER_REASON_KEY;
}

/**
 * Pick a PDF, read it, review it: the NFSe counterpart of the stock entry flow.
 * Without a connection the reading is not available, so the same review is
 * offered for typing the note by hand, to be sent once the connection is back.
 */
export function ServiceInvoiceUploadFlow() {
  const { t } = useTranslation();
  const upload = useServiceInvoiceUpload();
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

  return (
    <View className="gap-3">
      <ActionButton
        label={t('serviceInvoices.trigger')}
        icon={<Icon as={Upload} size={16} />}
        disabled={upload.step !== 'idle'}
        onPress={upload.start}
      />

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

      <LoadingOverlay
        visible={upload.step === 'extracting'}
        label={t('serviceInvoices.extracting')}
      />

      <MessageOverlay
        visible={upload.isFileRejected}
        message={t('serviceInvoices.errors.notPdf')}
        actionLabel={t('serviceInvoices.errors.dismiss')}
        onDismiss={upload.dismissRejection}
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
        onDiscard={pending.discardRejection}
        onKeep={pending.keepRejection}
      />

      {upload.review ? (
        <ServiceInvoiceReviewScreen
          visible={upload.step === 'review'}
          initial={upload.review}
          manualFile={upload.manualFile}
          onClose={upload.closeReview}
        />
      ) : null}
    </View>
  );
}

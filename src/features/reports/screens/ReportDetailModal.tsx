import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useTranslation } from 'shared/i18n';

import { reportDetailRows, reportFileName } from './reportPresenter';
import { ReportDetailSheet } from '../components/ReportDetailSheet';
import type { ReportHistoryItem } from '../domain/report.types';
import { useDeleteReport } from '../hooks/useDeleteReport';
import { useReportFile, type ReportFileStatus } from '../hooks/useReportFile';

type ReportDetailModalProps = {
  report: ReportHistoryItem | null;
  visible: boolean;
  isDownloaded: boolean;
  onClose: () => void;
  onDownloaded: (reportId: string) => void;
  onDeleted: (reportId: string) => void;
};

// iOS does not show a second Modal while the first is still leaving, so the
// detail and the confirmation take turns: each opens when the other reports it
// finished closing.
type Step = 'detail' | 'toConfirm' | 'confirm' | 'backToDetail' | 'deleted';

// Android saves the copy to a folder the person picks instead of opening it
// (see openLocalReport).
const DOWNLOADED_ACTION =
  Platform.OS === 'android' ? 'reports.detail.save' : 'reports.detail.open';

const STATUS_MESSAGE = {
  idle: null,
  downloading: 'reports.detail.downloading',
  done: null,
  failed: 'reports.detail.downloadFailed',
  offline: 'reports.detail.offline',
  missing: 'reports.detail.missing',
} as const satisfies Record<ReportFileStatus, string | null>;

export function ReportDetailModal({
  report,
  visible,
  isDownloaded,
  onClose,
  onDownloaded,
  onDeleted,
}: ReportDetailModalProps) {
  const { t, locale } = useTranslation();
  const file = useReportFile(report, { onDownloaded });
  const deletion = useDeleteReport();
  const [step, setStep] = useState<Step>('detail');

  const reportId = report?.id ?? null;
  const { clearError } = deletion;
  useEffect(() => {
    setStep('detail');
    clearError();
  }, [reportId, clearError]);

  if (!report) {
    return null;
  }

  const onDetailClosed = () => {
    if (step === 'toConfirm') setStep('confirm');
  };

  const onConfirmClosed = () => {
    if (step === 'backToDetail') {
      setStep('detail');
    } else if (step === 'deleted') {
      setStep('detail');
      onClose();
      onDeleted(report.id);
    }
  };

  const cancelDelete = () => {
    if (deletion.isDeleting) return;
    deletion.clearError();
    setStep('backToDetail');
  };

  const confirmDelete = async () => {
    if (await deletion.remove(report.id)) {
      setStep('deleted');
    }
  };

  const messageKey = STATUS_MESSAGE[file.status];
  const deleteError =
    deletion.error === 'offline'
      ? t('reports.delete.offline')
      : deletion.error === 'failed'
      ? t('reports.delete.failed')
      : null;

  return (
    <>
      <ReportDetailSheet
        visible={visible && step === 'detail'}
        title={t(`reports.kinds.${report.kind}`)}
        closeLabel={t('reports.detail.close')}
        rows={reportDetailRows(report, t, locale)}
        openLabel={t(
          isDownloaded ? DOWNLOADED_ACTION : 'reports.detail.download',
        )}
        statusMessage={messageKey ? t(messageKey) : null}
        isBusy={file.status === 'downloading'}
        deleteLabel={t('reports.delete.button')}
        onOpen={file.open}
        onDelete={() => setStep('toConfirm')}
        onClose={onClose}
        onClosed={onDetailClosed}
      />
      <ConfirmSheet
        visible={step === 'confirm'}
        confirmIcon={Trash2}
        title={t('reports.delete.confirmTitle')}
        message={
          deleteError ??
          t('reports.delete.confirmMessage', {
            name: reportFileName(report, t),
          })
        }
        confirmLabel={t(
          deletion.isDeleting
            ? 'reports.delete.confirming'
            : 'reports.delete.confirm',
        )}
        cancelLabel={t('reports.delete.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        onClosed={onConfirmClosed}
      />
    </>
  );
}

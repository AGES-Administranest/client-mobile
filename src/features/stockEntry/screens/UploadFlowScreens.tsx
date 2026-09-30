import { Modal } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { ConfirmFileScreen } from './ConfirmFileScreen';
import { ScanScreen } from './ScanScreen';
import { StockEntryModal } from './StockEntryModal';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MessageOverlay } from '../components/MessageOverlay';
import type { ReadingFailure } from '../domain/extraction';
import type { UploadFlow } from '../hooks/useUploadFlow';

type PdfFailure = Exclude<ReadingFailure, 'photo'>;

const PDF_FAILURE_KEYS: Record<
  PdfFailure,
  { title: TranslationKey; message: TranslationKey }
> = {
  noTextLayer: {
    title: 'stockEntry.reading.noTextLayer.title',
    message: 'stockEntry.reading.noTextLayer.message',
  },
  noTableFound: {
    title: 'stockEntry.reading.noTableFound.title',
    message: 'stockEntry.reading.noTableFound.message',
  },
  timeout: {
    title: 'stockEntry.reading.timeout.title',
    message: 'stockEntry.reading.timeout.message',
  },
  unreadable: {
    title: 'stockEntry.reading.unreadable.title',
    message: 'stockEntry.reading.unreadable.message',
  },
};

type UploadFlowScreensProps = {
  upload: UploadFlow;
  onTypeItem: () => void;
  onOpenExisting: (invoiceId: string) => void;
};

/** Everything between "Nova entrada" and a document read (or not). */
export function UploadFlowScreens({
  upload,
  onTypeItem,
  onOpenExisting,
}: UploadFlowScreensProps) {
  const { t } = useTranslation();
  const unread = upload.step === 'readingFailed' ? upload.readingFailure : null;
  const pdfFailure: PdfFailure | null =
    unread && unread.reason !== 'photo' ? unread.reason : null;
  const duplicateOf =
    upload.failure === 'duplicateFile' ? upload.duplicateOf : null;

  return (
    <>
      {/* Menu: attach a PDF, photograph the invoice or type an item */}
      <StockEntryModal
        visible={upload.step === 'menu'}
        onClose={upload.closeMenu}
        onScanNote={upload.startScan}
        onAttachPdf={upload.attachPdf}
        onTypeItem={onTypeItem}
      />

      {/* Camera */}
      <Modal
        visible={upload.step === 'scanning'}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={upload.cancelScan}
      >
        <ScanScreen
          onCapture={upload.capture}
          onPickFromLibrary={upload.pickFromLibrary}
          onCancel={upload.cancelScan}
        />
      </Modal>

      {/* PDF preview before sending */}
      <ConfirmFileScreen
        visible={upload.step === 'confirmFile'}
        fileName={upload.document?.name ?? ''}
        sizeBytes={upload.document?.sizeBytes ?? 0}
        onSend={upload.sendDocument}
        onReplace={() => upload.replaceDocument()}
        onCancel={upload.cancelDocument}
      />

      {/* Preparing or sending the file */}
      <LoadingOverlay
        visible={upload.step === 'preparing' || upload.step === 'uploading'}
        label={
          upload.step === 'preparing'
            ? t('stockEntry.preparing')
            : t('stockEntry.uploading')
        }
      />

      {/* PDF that could not be read, with the option to replace it */}
      <ConfirmSheet
        visible={pdfFailure !== null}
        title={pdfFailure ? t(PDF_FAILURE_KEYS[pdfFailure].title) : ''}
        message={pdfFailure ? t(PDF_FAILURE_KEYS[pdfFailure].message) : ''}
        confirmLabel={
          pdfFailure === 'noTextLayer'
            ? t('stockEntry.reading.replaceWithText')
            : t('stockEntry.reading.replace')
        }
        cancelLabel={t('stockEntry.reading.close')}
        onConfirm={() => upload.replaceDocument(unread?.invoiceId)}
        onCancel={upload.dismissReadingFailure}
      />

      {/* Photo kept only as a receipt */}
      <MessageOverlay
        visible={unread?.reason === 'photo'}
        message={t('stockEntry.reading.photo')}
        actionLabel={t('stockEntry.errors.dismiss')}
        onDismiss={upload.dismissReadingFailure}
      />

      {/* Duplicated file: open the existing entry */}
      <ConfirmSheet
        visible={duplicateOf !== null}
        title={t('stockEntry.duplicate.title')}
        message={t('stockEntry.duplicate.message')}
        confirmLabel={t('stockEntry.duplicate.open')}
        cancelLabel={t('stockEntry.duplicate.close')}
        onConfirm={() => duplicateOf && onOpenExisting(duplicateOf)}
        onCancel={upload.dismissFailure}
      />

      {/* Any other upload error */}
      <MessageOverlay
        visible={upload.failure !== null && duplicateOf === null}
        message={upload.failure ? t(`stockEntry.errors.${upload.failure}`) : ''}
        actionLabel={t('stockEntry.errors.dismiss')}
        onDismiss={upload.dismissFailure}
      />
    </>
  );
}

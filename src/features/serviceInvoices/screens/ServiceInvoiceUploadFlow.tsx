import { Upload } from 'lucide-react-native';
import { View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';
import { LoadingOverlay } from 'app/components/ui/loading-overlay';
import { MessageOverlay } from 'app/components/ui/message-overlay';
import { useTranslation } from 'shared/i18n';

import { ServiceInvoiceReviewScreen } from './ServiceInvoiceReviewScreen';
import { useServiceInvoiceUpload } from '../hooks/useServiceInvoiceUpload';

/** Pick a PDF, read it, review it: the NFSe counterpart of the stock entry flow. */
export function ServiceInvoiceUploadFlow() {
  const { t } = useTranslation();
  const upload = useServiceInvoiceUpload();

  return (
    <View>
      <ActionButton
        label={t('serviceInvoices.trigger')}
        icon={<Icon as={Upload} size={16} />}
        disabled={upload.step !== 'idle'}
        onPress={upload.start}
      />

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

      <MessageOverlay
        visible={upload.isPickFailed}
        message={t('serviceInvoices.errors.pickFailed')}
        actionLabel={t('serviceInvoices.errors.dismiss')}
        onDismiss={upload.dismissPickFailure}
      />

      {upload.review ? (
        <ServiceInvoiceReviewScreen
          visible={upload.step === 'review'}
          initial={upload.review}
          onClose={upload.closeReview}
        />
      ) : null}
    </View>
  );
}

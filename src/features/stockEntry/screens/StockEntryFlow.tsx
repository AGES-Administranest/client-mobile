import { Plus } from 'lucide-react-native';
import { Modal, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';
import { useTranslation } from 'shared/i18n';

import { ScanScreen } from './ScanScreen';
import { StockEntryModal } from './StockEntryModal';
import { StockReviewScreen } from './StockReviewScreen';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MessageOverlay } from '../components/MessageOverlay';
import { useStockEntryFlow } from '../hooks/useStockEntryFlow';

export function StockEntryFlow() {
  const { t } = useTranslation();
  const flow = useStockEntryFlow();

  return (
    <View>
      <ActionButton
        label={t('stockEntry.trigger')}
        icon={<Icon as={Plus} size={16} />}
        onPress={flow.openMenu}
      />

      <StockEntryModal
        visible={flow.step === 'menu'}
        onClose={flow.closeMenu}
        onScanNote={flow.startScan}
        onAttachPdf={flow.attachPdf}
        onTypeItem={flow.closeMenu}
      />

      <Modal
        visible={flow.step === 'scanning'}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={flow.cancelScan}
      >
        <ScanScreen
          onCapture={flow.capture}
          onPickFromLibrary={flow.pickFromLibrary}
          onCancel={flow.cancelScan}
        />
      </Modal>

      <LoadingOverlay
        visible={flow.step === 'uploading'}
        label={t('stockEntry.uploading')}
      />

      <StockReviewScreen
        visible={flow.step === 'review'}
        items={flow.items}
        onRenameItem={flow.renameItem}
        onChangeQuantity={flow.setItemQuantity}
        onRemoveItem={flow.removeItem}
        onConfirm={flow.confirm}
        onClose={flow.cancelReview}
      />

      <MessageOverlay
        visible={flow.failure !== null}
        message={flow.failure ? t(`stockEntry.errors.${flow.failure}`) : ''}
        actionLabel={t('stockEntry.errors.dismiss')}
        onDismiss={flow.dismissFailure}
      />
    </View>
  );
}

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

type StockEntryFlowProps = {
  // "Digitar insumo" opens the item form, which belongs to whoever owns the
  // stock and its persistence (today `features/materials`). This flow only
  // reports the intent and closes its own menu; without a handler the option
  // just dismisses, as it did before the form existed.
  onTypeItem?: () => void;
};

export function StockEntryFlow({ onTypeItem }: StockEntryFlowProps = {}) {
  const { t } = useTranslation();
  const flow = useStockEntryFlow();

  function handleTypeItem() {
    // Close first: the sheet animates out while the form animates in, instead
    // of the two sitting stacked.
    flow.closeMenu();
    onTypeItem?.();
  }

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
        onTypeItem={handleTypeItem}
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

import { Modal, View } from 'react-native';

import { ActionButton, PlusIcon } from 'shared/components';
import { useTranslation } from 'shared/i18n';

import { ScanScreen } from './ScanScreen';
import { StockEntryModal } from './StockEntryModal';
import { StockReviewScreen } from './StockReviewScreen';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MessageOverlay } from '../components/MessageOverlay';
import { useStockEntryFlow } from '../hooks/useStockEntryFlow';

// Entry point for the stock-entry feature. Wires the screens together with
// local state (menu → capture/attach → extraction → review).
export function StockEntryFlow() {
  const { t } = useTranslation();
  const flow = useStockEntryFlow();

  return (
    <View className="flex-1 items-center justify-center bg-background-modal px-5">
      <ActionButton
        label={t('stockEntry.trigger')}
        icon={<PlusIcon />}
        onPress={flow.openMenu}
      />

      <StockEntryModal
        visible={flow.step === 'menu'}
        onClose={flow.closeMenu}
        onScanNote={flow.startScan}
        onAttachPdf={flow.attachPdf}
        // "Digitar insumo" has no designed screen yet.
        onTypeItem={flow.closeMenu}
      />

      {/* A Modal, not an early return: returning here would leave the tab it
          belongs to mounted behind the camera, each at half height. */}
      <Modal visible={flow.step === 'scanning'} animationType="slide">
        <ScanScreen
          onCapture={flow.capture}
          onPickFromLibrary={flow.pickFromLibrary}
        />
      </Modal>

      <LoadingOverlay
        visible={flow.step === 'processing'}
        label={t('stockEntry.loading')}
      />

      <StockReviewScreen
        visible={flow.step === 'review'}
        items={flow.items}
        onRenameItem={flow.renameItem}
        onChangeQuantity={flow.setItemQuantity}
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

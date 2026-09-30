import { Inbox } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';
import { useTranslation } from 'shared/i18n';

import { EntriesScreen } from './EntriesScreen';
import { ReviewScreen } from './ReviewScreen';
import { UploadFlowScreens } from './UploadFlowScreens';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MessageOverlay } from '../components/MessageOverlay';
import { useEntries } from '../hooks/useEntries';
import { useEntryReview } from '../hooks/useEntryReview';
import { useUploadFlow } from '../hooks/useUploadFlow';

type StockEntryFlowProps = {
  // "Digitar insumo" opens the item form, which belongs to whoever owns the
  // stock and its persistence (today `features/materials`). This flow only
  // reports the intent and closes its own screens; without a handler the
  // option just dismisses, as it did before the form existed.
  onTypeItem?: () => void;
};

/** Materiais → Entradas: the pending list, a new upload and the review. */
export function StockEntryFlow({ onTypeItem }: StockEntryFlowProps = {}) {
  const { t } = useTranslation();
  const [isListOpen, setIsListOpen] = useState(false);
  const entries = useEntries();
  const review = useEntryReview();
  const upload = useUploadFlow({
    onRead: review.openRead,
    onSettled: entries.refresh,
  });
  const pendingCount = entries.drafts.length;

  function openList() {
    entries.refresh();
    setIsListOpen(true);
  }

  function handleTypeItem() {
    // Close first: the screens animate out while the form animates in,
    // instead of the form opening behind them.
    upload.closeMenu();
    setIsListOpen(false);
    onTypeItem?.();
  }

  function openEntry(invoiceId: string) {
    review.openSaved(invoiceId, upload.showReadingFailure);
  }

  function openExisting(invoiceId: string) {
    upload.dismissFailure();
    openEntry(invoiceId);
  }

  function closeReview() {
    review.close();
    entries.refresh();
  }

  function discardOpenEntry() {
    const invoiceId = review.entry?.invoiceId;
    review.close();
    if (invoiceId) entries.discard(invoiceId);
  }

  return (
    <View>
      {/* Materials button that opens the entries */}
      <ActionButton
        label={
          pendingCount > 0
            ? t('stockEntry.triggerWithCount', { count: pendingCount })
            : t('stockEntry.trigger')
        }
        icon={<Icon as={Inbox} size={16} />}
        onPress={openList}
      />

      {/* Pending list; everything else opens over it */}
      <EntriesScreen
        visible={isListOpen}
        onClose={() => setIsListOpen(false)}
        entries={entries}
        onOpen={openEntry}
        onReplace={upload.replaceDocument}
        onNewEntry={upload.openMenu}
      >
        {/* New entry: menu, camera, file and reading */}
        <UploadFlowScreens
          upload={upload}
          onTypeItem={handleTypeItem}
          onOpenExisting={openExisting}
        />

        {/* Review of the open entry */}
        {review.entry ? (
          <ReviewScreen
            key={review.entry.session}
            visible={review.isVisible}
            entry={review.entry}
            onClose={closeReview}
            onDiscard={discardOpenEntry}
          />
        ) : null}

        {/* Opening a saved entry */}
        <LoadingOverlay
          visible={review.isOpening}
          label={t('stockEntry.entries.opening')}
        />
        {/* Entry could not be opened */}
        <MessageOverlay
          visible={review.openFailed}
          message={t('stockEntry.entries.openFailed')}
          actionLabel={t('stockEntry.errors.dismiss')}
          onDismiss={review.dismissOpenFailure}
        />
      </EntriesScreen>
    </View>
  );
}

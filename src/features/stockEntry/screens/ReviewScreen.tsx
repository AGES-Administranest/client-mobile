import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { ActionButton } from 'app/components/ui';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { Icon } from 'app/components/ui/icon';
import { formatDateInput } from 'app/components/ui/item-modal/domain/itemModal';
import { Text } from 'app/components/ui/text';
import { backendUnitLabel } from 'features/materials';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { LinkItemScreen } from './LinkItemScreen';
import {
  attentionView,
  maskQuantityInput,
  moneyFromInput,
  moneyInput,
  quantityFromInput,
  reviewHeaderLabels,
  reviewLineLabels,
  reviewLineView,
  saveStatusLabel,
  sumView,
  type Formatters,
} from './reviewPresenter';
import { AttentionCounter } from '../components/AttentionCounter';
import { FullScreenModal } from '../components/FullScreenModal';
import { NoticeBanner } from '../components/NoticeBanner';
import { ReviewHeaderCard } from '../components/ReviewHeaderCard';
import { ReviewLineCard } from '../components/ReviewLineCard';
import { SaveStatusBar } from '../components/SaveStatusBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { MAX_DRAFT_TEXT_LENGTH } from '../domain/draft';
import {
  linesNeedingAttention,
  type LineIssue,
  type ReviewLine,
} from '../domain/review';
import { useDraftAutosave } from '../hooks/useDraftAutosave';
import type { OpenEntry } from '../hooks/useEntryReview';
import { useReview } from '../hooks/useReview';
import { useSupplierName } from '../hooks/useSupplierName';

type ReviewScreenProps = {
  visible: boolean;
  entry: OpenEntry;
  onClose: () => void;
  onDiscard: () => void;
};

export function ReviewScreen({
  visible,
  entry,
  onClose,
  onDiscard,
}: ReviewScreenProps) {
  const { t, locale } = useTranslation();
  const state = useReview(entry.initial);
  const autosave = useDraftAutosave(entry.invoiceId, state.review);
  const { header, lines, partial } = state.review;
  const supplier = useSupplierName(header.supplierId, header.supplierName);
  const [sheet, setSheet] = useState<'leave' | 'discard' | null>(null);
  const [typedQuantity, setTypedQuantity] = useState<string | null>(null);

  const format: Formatters = {
    t,
    money: value => formatCurrency(value, locale),
    number: value => value.toLocaleString(locale),
  };
  const attention = linesNeedingAttention(lines);
  const attentionLabels = attentionView(
    attention.length,
    state.onlyAttention,
    t,
  );
  const sum = sumView(state.review, format);
  const linking = lines.find(line => line.id === state.linkingLineId) ?? null;
  const fixes: Record<LineIssue, (id: string) => void> = {
    mismatch: state.acceptComputedTotal,
    shortName: state.openLinking,
    unlinked: state.openLinking,
    noQuantity: state.editLine,
    noUnitValue: state.editLine,
  };

  /** Leaves at once when everything is saved; asks when something is not. */
  async function requestClose() {
    if (await autosave.flush()) {
      onClose();
      return;
    }
    setSheet('leave');
  }

  function typeQuantity(lineId: string, text: string) {
    const typed = maskQuantityInput(text);
    setTypedQuantity(typed);
    state.changeLine(lineId, { quantity: quantityFromInput(typed) });
  }

  function renderLine(line: ReviewLine) {
    const isEditing = state.editingLineId === line.id;
    const view = reviewLineView(
      line,
      lines,
      format,
      isEditing ? typedQuantity : null,
    );
    const { issue } = view;

    return (
      <ReviewLineCard
        key={line.id}
        labels={reviewLineLabels(t)}
        description={view.description}
        splitLabel={view.splitLabel}
        linkName={view.linkName}
        unlinkedLabel={t('stockEntry.review.line.unlinked')}
        onLink={() => state.openLinking(line.id)}
        isEditing={isEditing}
        onToggleEdit={() => state.editLine(isEditing ? null : line.id)}
        shown={view.shown}
        inputs={view.inputs}
        lotMaxLength={MAX_DRAFT_TEXT_LENGTH}
        onChangeQuantity={text => typeQuantity(line.id, text)}
        onChangeUnitValue={text =>
          state.changeLine(line.id, { unitValue: moneyFromInput(text) })
        }
        onChangeLot={text => state.changeLine(line.id, { lot: text })}
        onChangeExpiry={text =>
          state.changeLine(line.id, { expiry: formatDateInput(text) })
        }
        issue={issue && { ...issue, onFix: () => fixes[issue.kind](line.id) }}
        onSplit={() => state.splitLine(line.id)}
        onRemove={() => state.removeLine(line.id)}
      />
    );
  }

  return (
    <FullScreenModal visible={visible} onRequestClose={requestClose}>
      {/* Top bar: back and title */}
      <ScreenHeader
        title={t('stockEntry.review.title')}
        backLabel={t('stockEntry.review.back')}
        onBack={requestClose}
      />
      {/* Autosave state of the draft */}
      <SaveStatusBar
        label={saveStatusLabel(autosave.status, t)}
        isSaving={autosave.status === 'saving'}
        hasFailed={autosave.status === 'failed'}
        retryLabel={t('stockEntry.review.save.retry')}
        onRetry={autosave.retry}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning when only part of the document was read */}
          {partial ? (
            <NoticeBanner
              tone="warning"
              message={t('stockEntry.review.partial', {
                read: partial.pagesRead,
                total: partial.totalPages,
              })}
            />
          ) : null}

          {/* Invoice header: supplier, number, date and total */}
          <ReviewHeaderCard
            labels={reviewHeaderLabels(t)}
            supplierName={
              supplier.name ?? t('stockEntry.review.supplierNotRead')
            }
            supplierNote={
              header.supplierName && !supplier.isRegistered
                ? t('stockEntry.review.supplierNotRegistered')
                : undefined
            }
            invoiceNumber={header.invoiceNumber}
            invoiceNumberMaxLength={MAX_DRAFT_TEXT_LENGTH}
            orderDate={header.orderDate}
            total={moneyInput(header.totalAmount)}
            sumLabel={sum.label}
            sumOff={sum.isOff}
            onChangeInvoiceNumber={text =>
              state.changeHeader({ invoiceNumber: text })
            }
            onChangeOrderDate={text =>
              state.changeHeader({ orderDate: formatDateInput(text) })
            }
            onChangeTotal={text =>
              state.changeHeader({ totalAmount: moneyFromInput(text) })
            }
          />

          {/* Lines needing attention, with the filter toggle */}
          <AttentionCounter
            label={attentionLabels.label}
            needsAttention={attention.length > 0}
            actionLabel={attentionLabels.actionLabel}
            onAction={state.toggleOnlyAttention}
          />

          {/* Lines section title and count */}
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
              {t('stockEntry.review.items')}
            </Text>
            <Text className="text-xs text-label-tertiary">
              {lines.length === 1
                ? t('stockEntry.review.linesOne')
                : t('stockEntry.review.lines', { count: lines.length })}
            </Text>
          </View>

          {/* One card per line */}
          {(state.onlyAttention ? attention : lines).map(renderLine)}

          {/* Add a line by hand */}
          <Pressable
            onPress={state.addLine}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 py-2"
          >
            <Icon as={Plus} size={16} className="text-label-quartenery" />
            <Text className="text-sm font-semibold text-label-quartenery">
              {t('stockEntry.review.addLine')}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Footer: stock entry (disabled until step 3) and discard */}
        <View className="gap-3 px-4 pb-4 pt-2">
          <ActionButton
            label={t('stockEntry.review.confirm')}
            icon={<Icon as={Check} size={16} />}
            disabled
          />
          <Text className="text-center text-xs text-label-tertiary">
            {t('stockEntry.review.confirmUnavailable')}
          </Text>
          <Pressable
            onPress={() => setSheet('discard')}
            accessibilityRole="button"
          >
            <Text className="text-center text-sm text-label-tertiary">
              {t('stockEntry.review.discard')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Link a line to a catalog item, over the review */}
      <LinkItemScreen
        visible={linking !== null}
        lineNumber={linking ? lines.indexOf(linking) + 1 : 0}
        lineCount={lines.length}
        description={
          linking?.description || t('stockEntry.review.line.addedByHand')
        }
        candidates={(linking?.candidates ?? []).map(candidate => ({
          itemId: candidate.itemId,
          name: candidate.name,
          unit: backendUnitLabel(candidate.unit),
        }))}
        onPick={state.linkTo}
        onBack={state.closeLinking}
        onCreate={state.startNewItem}
        createFailed={state.newItemFailed}
        newItem={state.newItem}
        onCancelNewItem={state.cancelNewItem}
        isCreatingItem={state.isCreatingItem}
        onConfirmNewItem={draft => {
          state.createAndLink(draft);
        }}
      />

      {/* Confirms leaving with unsaved changes */}
      <ConfirmSheet
        visible={sheet === 'leave'}
        title={t('stockEntry.review.leaveTitle')}
        message={t('stockEntry.review.leaveMessage')}
        confirmLabel={t('stockEntry.review.leaveConfirm')}
        cancelLabel={t('stockEntry.review.leaveCancel')}
        onConfirm={() => {
          setSheet(null);
          onClose();
        }}
        onCancel={() => setSheet(null)}
      />

      {/* Confirms discarding the entry */}
      <ConfirmSheet
        visible={sheet === 'discard'}
        title={t('stockEntry.entries.discardTitle')}
        message={t('stockEntry.entries.discardMessage')}
        confirmLabel={t('stockEntry.entries.discardConfirm')}
        cancelLabel={t('stockEntry.entries.discardCancel')}
        onConfirm={() => {
          setSheet(null);
          onDiscard();
        }}
        onCancel={() => setSheet(null)}
      />
    </FullScreenModal>
  );
}

import { Inbox, Plus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { entryCardView, type EntryCardView } from './entriesPresenter';
import { EntryCard, type EntryAction } from '../components/EntryCard';
import { FullScreenModal } from '../components/FullScreenModal';
import { NoticeBanner } from '../components/NoticeBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import type { DraftSummary } from '../domain/draft';
import type { EntriesState } from '../hooks/useEntries';

type EntriesScreenProps = {
  visible: boolean;
  onClose: () => void;
  entries: EntriesState;
  onOpen: (id: string) => void;
  onReplace: (id: string) => void;
  onNewEntry: () => void;
  /** What opens over the list: the upload and the review. */
  children: ReactNode;
};

export function EntriesScreen({
  visible,
  onClose,
  entries,
  onOpen,
  onReplace,
  onNewEntry,
  children,
}: EntriesScreenProps) {
  const { t, locale } = useTranslation();
  const [pendingDiscard, setPendingDiscard] = useState<string | null>(null);
  const money = (value: number) => formatCurrency(value, locale);

  function actionsFor(view: EntryCardView, id: string): EntryAction[] {
    const discard = {
      label: t('stockEntry.entries.actions.discard'),
      onPress: () => setPendingDiscard(id),
    };
    switch (view.status) {
      case 'ready':
        return [
          {
            label: t('stockEntry.entries.actions.review'),
            onPress: () => onOpen(id),
            emphasis: true,
          },
          discard,
        ];
      case 'failed':
        return [
          {
            label: t('stockEntry.entries.actions.replace'),
            onPress: () => onReplace(id),
            emphasis: true,
          },
          discard,
        ];
      case 'processing':
        return [];
      default:
        return [discard];
    }
  }

  function renderDraft(draft: DraftSummary) {
    const view = entryCardView(draft, t, money);
    return (
      <EntryCard
        key={draft.id}
        title={view.title}
        meta={view.meta}
        value={view.value}
        statusLabel={view.statusLabel}
        statusTone={view.statusTone}
        reason={view.reason}
        actions={actionsFor(view, draft.id)}
        onPress={view.status === 'ready' ? () => onOpen(draft.id) : undefined}
      />
    );
  }

  function confirmDiscard() {
    if (pendingDiscard) entries.discard(pendingDiscard);
    setPendingDiscard(null);
  }

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      {/* Top bar: back and title */}
      <ScreenHeader
        title={t('stockEntry.entries.title')}
        backLabel={t('stockEntry.entries.back')}
        onBack={onClose}
      />

      <ScrollView contentContainerClassName="gap-3 px-4 pb-6">
        {/* Error when a discard fails */}
        {entries.discardFailed ? (
          <NoticeBanner
            tone="alert"
            message={t('stockEntry.entries.discardFailed')}
            actionLabel={t('stockEntry.errors.dismiss')}
            onAction={entries.dismissDiscardFailure}
          />
        ) : null}

        {/* Error loading the list, with retry */}
        {entries.status === 'failed' ? (
          <View className="gap-2">
            <NoticeBanner
              tone="alert"
              message={t('stockEntry.entries.loadFailed')}
            />
            <Pressable onPress={entries.refresh} accessibilityRole="button">
              <Text className="text-center text-sm font-semibold text-label-quartenery">
                {t('stockEntry.entries.retry')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Loading */}
        {entries.status === 'loading' ? (
          <Text className="py-8 text-center text-sm text-label-tertiary">
            {t('common.loading')}
          </Text>
        ) : null}

        {/* Nothing pending */}
        {entries.status === 'ready' && entries.drafts.length === 0 ? (
          <EmptyState icon={Inbox} message={t('stockEntry.entries.empty')} />
        ) : null}

        {/* Pending section title and count */}
        {entries.drafts.length > 0 ? (
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
              {t('stockEntry.entries.pending')}
            </Text>
            <Text className="text-xs text-label-tertiary">
              {entries.drafts.length === 1
                ? t('stockEntry.entries.countOne')
                : t('stockEntry.entries.count', {
                    count: entries.drafts.length,
                  })}
            </Text>
          </View>
        ) : null}

        {/* One card per pending entry */}
        {entries.drafts.map(renderDraft)}
      </ScrollView>

      {/* New entry button */}
      <View className="px-4 pb-4 pt-2">
        <ActionButton
          label={t('stockEntry.entries.newEntry')}
          icon={<Icon as={Plus} size={16} />}
          onPress={onNewEntry}
        />
      </View>

      {/* Confirms discarding an entry */}
      <ConfirmSheet
        visible={pendingDiscard !== null}
        title={t('stockEntry.entries.discardTitle')}
        message={t('stockEntry.entries.discardMessage')}
        confirmLabel={t('stockEntry.entries.discardConfirm')}
        cancelLabel={t('stockEntry.entries.discardCancel')}
        onConfirm={confirmDiscard}
        onCancel={() => setPendingDiscard(null)}
      />

      {/* Upload flow and review, opened over the list */}
      {children}
    </FullScreenModal>
  );
}

import { PackagePlus, Quote, Search } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import {
  ItemModal,
  type ItemDraft,
  type ItemPrefill,
} from 'app/components/ui/item-modal/item-modal';
import { Text } from 'app/components/ui/text';
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from 'features/materials';
import { useSupplySelector } from 'features/stock';
import { useTranslation } from 'shared/i18n';
import { LabelPlaceholder } from 'theme/colors';

import { CatalogOption } from '../components/CatalogOption';
import { FullScreenModal } from '../components/FullScreenModal';
import { NoticeBanner } from '../components/NoticeBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import type { LinkedItem } from '../domain/review';

type Candidate = { itemId: string; name: string; unit: string };

type LinkItemScreenProps = {
  visible: boolean;
  lineNumber: number;
  lineCount: number;
  description: string;
  candidates: readonly Candidate[];
  onPick: (item: LinkedItem) => void;
  onBack: () => void;
  onCreate: (name: string) => void;
  createFailed: boolean;
  newItem: ItemPrefill | null;
  onCancelNewItem: () => void;
  onConfirmNewItem: (draft: ItemDraft) => void;
};

export function LinkItemScreen({
  visible,
  lineNumber,
  lineCount,
  description,
  candidates,
  onPick,
  onBack,
  onCreate,
  createFailed,
  newItem,
  onCancelNewItem,
  onConfirmNewItem,
}: LinkItemScreenProps) {
  const { t } = useTranslation();
  const search = useSupplySelector();
  const { reset } = search;
  const term = search.term.trim();

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const showsSearch = term !== '';
  const hasNoResults =
    showsSearch &&
    !search.isTermTooShort &&
    !search.isLoading &&
    !search.hasError &&
    search.options.length === 0;

  return (
    <FullScreenModal visible={visible} onRequestClose={onBack}>
      {/* Top bar: back and title */}
      <ScreenHeader
        title={t('stockEntry.link.title')}
        backLabel={t('stockEntry.link.back')}
        onBack={onBack}
      />

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* The line being linked, as printed */}
        <View className="gap-2 rounded-2xl bg-white p-4">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
            {t('stockEntry.link.lineOf', {
              index: lineNumber,
              count: lineCount,
            })}
          </Text>
          <View className="flex-row items-start gap-2">
            <Icon as={Quote} size={14} className="mt-0.5 text-label-tertiary" />
            <Text className="flex-1 text-sm text-label-primary">
              {description}
            </Text>
          </View>
        </View>

        {/* Catalog search */}
        <View className="gap-1">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
            {t('stockEntry.link.catalogItem')}
          </Text>
          <View className="flex-row items-center gap-2 rounded-xl border border-border-primary bg-white px-3">
            <Icon as={Search} size={16} className="text-label-tertiary" />
            <TextInput
              value={search.term}
              onChangeText={search.onTermChange}
              placeholder={t('stockEntry.link.searchPlaceholder')}
              placeholderTextColor={LabelPlaceholder}
              autoCorrect={false}
              className="flex-1 py-2.5 text-sm text-label-primary"
            />
          </View>
        </View>

        {/* Error when registering the new item */}
        {createFailed ? (
          <NoticeBanner
            tone="alert"
            message={t('stockEntry.link.createFailed')}
          />
        ) : null}

        {/* Search results, or the reading's suggestions before any search */}
        {showsSearch ? (
          <SearchResults
            title={
              hasNoResults
                ? t('stockEntry.link.noResults')
                : search.options.length === 1
                ? t('stockEntry.link.resultsOne')
                : t('stockEntry.link.results', {
                    count: search.options.length,
                  })
            }
            status={
              search.isTermTooShort
                ? t('stockEntry.link.typeMore')
                : search.isLoading
                ? t('stockEntry.link.searching')
                : search.hasError
                ? t('stockEntry.link.searchError')
                : hasNoResults
                ? t('stockEntry.link.noResultsHint', { term })
                : null
            }
          >
            {search.options.map(option => (
              <CatalogOption
                key={option.id}
                title={option.name}
                caption={option.unit}
                onPress={() =>
                  onPick({
                    itemId: option.id,
                    name: option.name,
                    unit: option.unit,
                  })
                }
              />
            ))}
            {hasNoResults ? (
              <CatalogOption
                icon={PackagePlus}
                title={t('stockEntry.link.create', { name: term })}
                caption={t('stockEntry.link.createCaption')}
                onPress={() => onCreate(term)}
              />
            ) : null}
          </SearchResults>
        ) : (
          <SearchResults
            title={t('stockEntry.link.suggestions')}
            status={
              candidates.length === 0
                ? t('stockEntry.link.noSuggestions')
                : null
            }
          >
            {candidates.map(candidate => (
              <CatalogOption
                key={candidate.itemId}
                title={candidate.name}
                caption={candidate.unit}
                onPress={() => onPick(candidate)}
              />
            ))}
          </SearchResults>
        )}
      </ScrollView>

      {/* New item form, pre-filled from the line */}
      <ItemModal
        mode="create"
        visible={newItem !== null}
        initialDraft={newItem ?? undefined}
        categoryOptions={CATEGORY_OPTIONS}
        unitOptions={UNIT_OPTIONS}
        onConfirm={onConfirmNewItem}
        onClose={onCancelNewItem}
      />
    </FullScreenModal>
  );
}

function SearchResults({
  title,
  status,
  children,
}: {
  title: string;
  status: string | null;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
        {title}
      </Text>
      {status ? (
        <Text className="text-sm text-label-tertiary">{status}</Text>
      ) : null}
      <View className="overflow-hidden rounded-2xl bg-white">{children}</View>
    </View>
  );
}

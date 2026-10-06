import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, PiggyBank, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';
import { useTranslation, type TranslationKey } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';
import { Colors } from 'theme/colors';

import { FixedCostCard } from '../components/FixedCostCard';
import { FixedCostFormSheet } from '../components/FixedCostFormSheet';
import { FixedCostsTotalCard } from '../components/FixedCostsTotalCard';
import {
  FIXED_COST_CATEGORIES,
  type FixedCost,
  type FixedCostCategory,
} from '../domain/fixedCost';
import type { FixedCostField } from '../domain/validateFixedCostForm';
import { useFixedCostForm } from '../hooks/useFixedCostForm';
import { useFixedCosts } from '../hooks/useFixedCosts';

type FixedCostsScreenProps = {
  visible: boolean;
  onClose: () => void;
};

function categoryKey(category: FixedCostCategory): TranslationKey {
  return `fixedCosts.categories.${category}` as TranslationKey;
}

export function FixedCostsScreen({ visible, onClose }: FixedCostsScreenProps) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    visibleFixedCosts,
    monthlyTotal,
    activeCount,
    showInactive,
    toggleShowInactive,
    isLoading,
    failure,
    setFixedCosts,
  } = useFixedCosts();

  const [sheetOpenFor, setSheetOpenFor] = useState<FixedCost | 'new' | null>(
    null,
  );
  const editing = sheetOpenFor === 'new' ? null : sheetOpenFor;
  const form = useFixedCostForm(editing);

  function openCreate() {
    // `editing` vira null assim que `sheetOpenFor` muda para 'new', e o
    // próprio useFixedCostForm já reseta o draft quando `editing` muda — não
    // precisa chamar form.reset() aqui (e chamar antes do setState pegaria o
    // `editing` antigo, ainda não atualizado).
    setSheetOpenFor('new');
  }

  function openEdit(fixedCost: FixedCost) {
    setSheetOpenFor(fixedCost);
  }

  function closeSheet() {
    setSheetOpenFor(null);
  }

  async function handleSubmit() {
    const saved = await form.submit();
    if (!saved) return;

    setFixedCosts(current =>
      editing
        ? current.map(item => (item.id === saved.id ? saved : item))
        : [...current, saved],
    );
    closeSheet();
  }

  async function handleDeactivate() {
    const deactivated = await form.deactivate();
    if (!deactivated) return;

    setFixedCosts(current =>
      current.map(item => (item.id === deactivated.id ? deactivated : item)),
    );
    closeSheet();
  }

  const categoryOptions = FIXED_COST_CATEGORIES.map(
    (category: FixedCostCategory) => ({
      value: category,
      label: t(categoryKey(category)),
    }),
  );

  const errorText = (field: Exclude<FixedCostField, 'category'>) => {
    const code = form.errors[field];
    return code
      ? t(`fixedCosts.form.errors.${code}` as TranslationKey)
      : undefined;
  };

  const failureText = (() => {
    if (!form.failure) return null;
    return form.failure === 'session'
      ? t('fixedCosts.form.errorSession')
      : t('fixedCosts.form.errorUnknown');
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ paddingTop: insets.top + 12 }}>
        <LinearGradient
          colors={Colors.background.primary.colors}
          locations={Colors.background.primary.locations}
          style={StyleSheet.absoluteFill}
        />

        <View className="flex-row items-center gap-3 px-5 pb-2 pt-1">
          <Button
            shape="pill"
            size="icon"
            icon={ChevronLeft}
            accessibilityRole="button"
            accessibilityLabel={t('fixedCosts.back')}
            onPress={onClose}
          />
          <Text className="text-xl font-bold text-label-primary">
            {t('fixedCosts.title')}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-28 pt-2"
        >
          <FixedCostsTotalCard
            label={t('fixedCosts.totalLabel')}
            formattedTotal={formatCurrency(monthlyTotal, locale)}
            countLabel={t(
              activeCount === 1
                ? 'fixedCosts.activeCountOne'
                : 'fixedCosts.activeCountOther',
              { count: activeCount },
            )}
          />

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-label-tertiary">
              {t('fixedCosts.listTitle')}
            </Text>
            <Pressable
              onPress={toggleShowInactive}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text className="text-[13px] font-semibold text-label-quartenery">
                {t(
                  showInactive
                    ? 'fixedCosts.hideInactive'
                    : 'fixedCosts.showInactive',
                )}
              </Text>
            </Pressable>
          </View>

          {failure ? (
            <Text className="py-2 text-center text-sm text-label-tertiary">
              {t(
                failure === 'session'
                  ? 'fixedCosts.form.errorSession'
                  : 'fixedCosts.errorLoad',
              )}
            </Text>
          ) : null}

          {!isLoading && !failure && visibleFixedCosts.length === 0 ? (
            <EmptyState icon={PiggyBank} message={t('fixedCosts.empty')} />
          ) : (
            visibleFixedCosts.map(fixedCost => (
              <FixedCostCard
                key={fixedCost.id}
                description={fixedCost.description}
                categoryLabel={t(categoryKey(fixedCost.category))}
                formattedValue={formatCurrency(fixedCost.monthlyAmount, locale)}
                inactive={!fixedCost.active}
                inactiveLabel={t('fixedCosts.inactiveTag')}
                onPress={() => openEdit(fixedCost)}
              />
            ))
          )}
        </ScrollView>

        <View className="px-4 pb-4">
          <Button
            shape="pill"
            icon={Plus}
            className="h-10 w-full"
            onPress={openCreate}
          >
            <Text className="font-semibold">{t('fixedCosts.addButton')}</Text>
          </Button>
        </View>
      </View>

      <FixedCostFormSheet
        visible={sheetOpenFor !== null}
        isEditing={form.isEditing}
        draft={form.draft}
        isSaving={form.isSaving}
        isDeactivating={form.isDeactivating}
        failureText={failureText}
        texts={{
          title: t('fixedCosts.form.title'),
          editTitle: t('fixedCosts.form.editTitle'),
          confirm: t('fixedCosts.form.confirm'),
          saving: t('fixedCosts.form.saving'),
          deactivate: t('fixedCosts.form.deactivate'),
          deactivating: t('fixedCosts.form.deactivating'),
          deactivateConfirmTitle: t('fixedCosts.form.deactivateConfirmTitle'),
          deactivateConfirmMessage: t(
            'fixedCosts.form.deactivateConfirmMessage',
          ),
          close: t('fixedCosts.form.close'),
          cancel: t('fixedCosts.form.cancel'),
          labels: {
            description: t('fixedCosts.form.labels.description'),
            monthlyAmount: t('fixedCosts.form.labels.monthlyAmount'),
            category: t('fixedCosts.form.labels.category'),
          },
          placeholders: {
            description: t('fixedCosts.form.placeholders.description'),
            monthlyAmount: t('fixedCosts.form.placeholders.monthlyAmount'),
          },
          errors: {
            description: errorText('description'),
            monthlyAmount: errorText('monthlyAmount'),
            category: form.errors.category
              ? t('fixedCosts.form.errors.required')
              : undefined,
          },
          categoryOptions,
        }}
        onChangeText={form.setField}
        onChangeCategory={form.setCategory}
        onSubmit={handleSubmit}
        onDeactivate={handleDeactivate}
        onClose={closeSheet}
      />
    </Modal>
  );
}

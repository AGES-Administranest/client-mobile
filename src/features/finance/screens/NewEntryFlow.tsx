import { FileText, PackageMinus, Pencil } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { OutputAdjustmentSheet } from 'features/stock';
import { useTranslation } from 'shared/i18n';

import { NewEntryForm } from './NewEntryForm';
import { NewEntryButton } from '../components/NewEntryButton';
import type { FinancialEntry } from '../domain/financialEntry';

const SAVED_MESSAGE_DURATION_MS = 3000;

type SavedMessageKey = 'financialEntries.stockWriteOffSaved';

type NewEntryFlowProps = {
  onEntrySaved?: (entry: FinancialEntry) => void;
  showButton?: boolean;
  containerClassName?: string;
  children?: (flow: { openOptions: () => void }) => ReactNode;
};

export function NewEntryFlow({
  onEntrySaved,
  showButton = true,
  containerClassName,
  children,
}: NewEntryFlowProps) {
  const { t } = useTranslation();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [documentSoonVisible, setDocumentSoonVisible] = useState(false);
  // Continua montado depois de fechar, para a animação de saída rodar.
  const [formOpenedOnce, setFormOpenedOnce] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [stockWriteOffOpenedOnce, setStockWriteOffOpenedOnce] = useState(false);
  const [stockWriteOffVisible, setStockWriteOffVisible] = useState(false);
  const [savedMessageKey, setSavedMessageKey] =
    useState<SavedMessageKey | null>(null);
  // iOS: um Modal não abre enquanto outro fecha.
  const openAfterOptionsLeave = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!savedMessageKey) {
      return;
    }

    // Some em 3 s: sem o anúncio, quem usa leitor de tela nunca chega a ouvir.
    AccessibilityInfo.announceForAccessibility(t(savedMessageKey));
    const timer = setTimeout(
      () => setSavedMessageKey(null),
      SAVED_MESSAGE_DURATION_MS,
    );

    return () => clearTimeout(timer);
  }, [savedMessageKey, t]);

  const choose = (openNext?: () => void) => {
    openAfterOptionsLeave.current = openNext ?? null;
    setOptionsVisible(false);
  };

  const openChosenSheet = () => {
    const open = openAfterOptionsLeave.current;
    openAfterOptionsLeave.current = null;
    open?.();
  };

  const openOptions = () => {
    setSavedMessageKey(null);
    setOptionsVisible(true);
  };

  const openForm = () => {
    setFormOpenedOnce(true);
    setFormVisible(true);
  };

  const finishSaving = (entry: FinancialEntry) => {
    setFormVisible(false);
    onEntrySaved?.(entry);
  };

  const openStockWriteOff = () => {
    setStockWriteOffOpenedOnce(true);
    setStockWriteOffVisible(true);
  };

  const finishStockWriteOff = () => {
    setStockWriteOffVisible(false);
    setSavedMessageKey('financialEntries.stockWriteOffSaved');
  };

  return (
    <View className={cn('gap-3 px-4 pt-3', containerClassName)}>
      {showButton ? (
        <NewEntryButton
          label={t('financialEntries.newEntry')}
          onPress={openOptions}
        />
      ) : null}

      {savedMessageKey ? (
        <View
          role="status"
          accessibilityLiveRegion="polite"
          className="rounded-xl border border-details-tertiary bg-details-secondary p-3"
        >
          <Text className="text-sm text-label-primary">
            {t(savedMessageKey)}
          </Text>
        </View>
      ) : null}

      {children?.({ openOptions })}

      <OptionsModal
        visible={optionsVisible}
        onClose={() => choose()}
        onClosed={openChosenSheet}
        title={t('financialEntries.options.title')}
        description={t('financialEntries.options.descriptionWithStockWriteOff')}
        options={[
          {
            label: t('financialEntries.options.sendDocument'),
            icon: FileText,
            onPress: () => choose(() => setDocumentSoonVisible(true)),
          },
          {
            label: t('financialEntries.options.manual'),
            icon: Pencil,
            onPress: () => choose(openForm),
          },
          {
            label: t('financialEntries.options.stockWriteOff'),
            icon: PackageMinus,
            onPress: () => choose(openStockWriteOff),
          },
        ]}
      />

      {/* O upload de PDF depende das US01/US10: até lá o toque recebe este aviso. */}
      <ConfirmSheet
        visible={documentSoonVisible}
        title={t('financialEntries.documentSoon.title')}
        message={t('financialEntries.documentSoon.message')}
        confirmLabel={t('financialEntries.documentSoon.ok')}
        onConfirm={() => setDocumentSoonVisible(false)}
        onCancel={() => setDocumentSoonVisible(false)}
      />

      {formOpenedOnce ? (
        <NewEntryForm
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          onSaved={finishSaving}
        />
      ) : null}

      {stockWriteOffOpenedOnce ? (
        <OutputAdjustmentSheet
          visible={stockWriteOffVisible}
          onClose={() => setStockWriteOffVisible(false)}
          onSaved={finishStockWriteOff}
        />
      ) : null}
    </View>
  );
}

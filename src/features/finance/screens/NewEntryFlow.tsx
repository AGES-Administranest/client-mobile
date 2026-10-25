import { FileText, PackageMinus, Pencil } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { OptionsModal } from 'app/components/ui/options-modal';
import { cn } from 'app/lib/utils';
import { OutputAdjustmentSheet } from 'features/stock';
import { useTranslation } from 'shared/i18n';

import { NewEntryForm } from './NewEntryForm';
import { NewEntryButton } from '../components/NewEntryButton';
import type { FinancialEntry } from '../domain/financialEntry';

type NewEntryFlowProps = {
  /** The PDF choice: the screen starts the NFSe upload once the options have left. */
  onSendDocument: () => void;
  onEntrySaved?: (entry: FinancialEntry) => void;
  showButton?: boolean;
  containerClassName?: string;
  children?: (flow: { openOptions: () => void }) => ReactNode;
};

export function NewEntryFlow({
  onSendDocument,
  onEntrySaved,
  showButton = true,
  containerClassName,
  children,
}: NewEntryFlowProps) {
  const { t } = useTranslation();
  const [optionsVisible, setOptionsVisible] = useState(false);
  // Continua montado depois de fechar, para a animação de saída rodar.
  const [formOpenedOnce, setFormOpenedOnce] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [stockWriteOffOpenedOnce, setStockWriteOffOpenedOnce] = useState(false);
  const [stockWriteOffVisible, setStockWriteOffVisible] = useState(false);
  // iOS: um Modal não abre enquanto outro fecha.
  const openAfterOptionsLeave = useRef<(() => void) | null>(null);

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
  };

  return (
    <View className={cn('gap-3 px-4 pt-3', containerClassName)}>
      {showButton ? (
        <NewEntryButton
          label={t('financialEntries.newEntry')}
          onPress={openOptions}
        />
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
            onPress: () => choose(onSendDocument),
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

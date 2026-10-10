import { FileText, Pencil } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { OptionsModal } from 'app/components/ui/options-modal';
import { useTranslation } from 'shared/i18n';

import { NewEntryButton } from '../components/NewEntryButton';

export function NewEntryFlow() {
  const { t } = useTranslation();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [documentSoonVisible, setDocumentSoonVisible] = useState(false);
  // A folha seguinte só abre depois que a de opções termina de sair: no iOS
  // um Modal não aparece enquanto outro ainda está fechando.
  const nextAction = useRef<(() => void) | null>(null);

  const choose = (action?: () => void) => {
    nextAction.current = action ?? null;
    setOptionsVisible(false);
  };

  const runNextAction = () => {
    const action = nextAction.current;
    nextAction.current = null;
    action?.();
  };

  return (
    <View className="px-4 pt-3">
      <NewEntryButton
        label={t('financialEntries.newEntry')}
        onPress={() => setOptionsVisible(true)}
      />

      <OptionsModal
        visible={optionsVisible}
        onClose={() => choose()}
        onClosed={runNextAction}
        title={t('financialEntries.options.title')}
        description={t('financialEntries.options.description')}
        options={[
          {
            label: t('financialEntries.options.sendDocument'),
            icon: FileText,
            onPress: () => choose(() => setDocumentSoonVisible(true)),
          },
          {
            label: t('financialEntries.options.manual'),
            icon: Pencil,
            onPress: () => choose(),
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
    </View>
  );
}

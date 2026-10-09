import { FileText, Pencil } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { NewEntryForm } from './NewEntryForm';
import { NewEntryButton } from '../components/NewEntryButton';

export function NewEntryFlow() {
  const { t } = useTranslation();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [documentSoonVisible, setDocumentSoonVisible] = useState(false);
  // O formulário só monta na primeira abertura (e as categorias só são
  // buscadas aí); depois fica montado para a animação de saída rodar.
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
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

  const openOptions = () => {
    setSavedVisible(false);
    setOptionsVisible(true);
  };

  const openForm = () => {
    setFormMounted(true);
    setFormVisible(true);
  };

  const finishSaving = () => {
    setFormVisible(false);
    setSavedVisible(true);
  };

  return (
    <View className="gap-3 px-4 pt-3">
      <NewEntryButton
        label={t('financialEntries.newEntry')}
        onPress={openOptions}
      />

      {savedVisible ? (
        <View className="rounded-xl border border-details-tertiary bg-details-secondary p-3">
          <Text className="text-sm text-label-primary">
            {t('financialEntries.saved')}
          </Text>
        </View>
      ) : null}

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
            onPress: () => choose(openForm),
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

      {formMounted ? (
        <NewEntryForm
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          onSaved={finishSaving}
        />
      ) : null}
    </View>
  );
}

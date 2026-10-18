import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  ClipboardList,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { AppointmentDetailScreen } from 'features/procedures';
import { useTranslation } from 'shared/i18n';

import { NewEntryForm } from './NewEntryForm';
import {
  EntryDetailSheet,
  type EntryDetailFields,
  type EntryDetailOriginAction,
} from '../components/EntryDetailSheet';
import { draftFromEntry } from '../domain/entryForm';
import {
  lockedFieldsOf,
  openableAppointmentId,
  originKeyOf,
  type LockedEntryField,
} from '../domain/entryOrigin';
import { defaultCategoryKey } from '../domain/financialCategory';
import type { FinancialEntry } from '../domain/financialEntry';
import { useDeleteEntry } from '../hooks/useDeleteEntry';

type Step = 'detail' | 'edit' | 'confirmDelete' | 'blockedDelete' | 'origin';

type EntryDetailFlowProps = {
  /** O lançamento tocado no extrato; null quando nada está aberto. */
  entry: FinancialEntry | null;
  /** O extrato precisa recarregar: algo mudou ou sumiu. */
  onChanged: () => void;
  onFinished: () => void;
};

export function EntryDetailFlow({
  entry,
  onChanged,
  onFinished,
}: EntryDetailFlowProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState<FinancialEntry | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  // iOS: um Modal não abre enquanto outro fecha. Cada sheet avisa quando
  // terminou de sair (onClosed) e só então o próximo passo aparece.
  const nextStep = useRef<Step | 'done' | null>(null);
  const entryIsGone = useRef(false);
  const deleter = useDeleteEntry();

  useEffect(() => {
    if (entry) {
      entryIsGone.current = false;
      nextStep.current = null;
      setShown(entry);
      setStep('detail');
    }
  }, [entry]);

  const leave = (next: Step | 'done') => {
    nextStep.current = next;
    setStep(null);
  };

  const finish = () => {
    setStep(null);
    setShown(null);
    onFinished();
  };

  const continueAfterClose = () => {
    const next = nextStep.current;
    nextStep.current = null;
    if (next === 'done') {
      finish();
    } else if (next) {
      setStep(next);
    }
  };

  if (!shown) {
    return null;
  }

  const originKey = originKeyOf(shown);
  const appointmentId = openableAppointmentId(shown);
  const locked = lockedFieldsOf(shown);
  const saved = draftFromEntry(shown);
  const natureLabel = t(
    shown.nature === 'INCOME'
      ? 'financialEntries.form.nature.income'
      : 'financialEntries.form.nature.expense',
  );
  const categoryKey = defaultCategoryKey(shown.category);

  const field = (
    name: keyof EntryDetailFields,
    label: string,
    value: string,
  ) => {
    const isLocked = locked.includes(name as LockedEntryField);
    return {
      label,
      value,
      locked: isLocked,
      accessibilityLabel: t(
        isLocked
          ? 'financialEntries.detail.lockedField'
          : 'financialEntries.detail.field',
        { label, value },
      ),
    };
  };

  const fields: EntryDetailFields = {
    nature: {
      ...field('nature', t('financialEntries.form.nature.label'), natureLabel),
      icon: shown.nature === 'INCOME' ? ArrowUp : ArrowDown,
    },
    description: field(
      'description',
      t('financialEntries.form.description.label'),
      shown.description,
    ),
    amount: field(
      'amount',
      t('financialEntries.form.amount.label'),
      saved.amount,
    ),
    date: field('date', t('financialEntries.form.date.label'), saved.date),
    category: field(
      'category',
      t('financialEntries.form.category.label'),
      categoryKey
        ? t(`financialEntries.categories.${categoryKey}`)
        : shown.category.name,
    ),
    scope: field(
      'scope',
      t('financialEntries.form.scope.label'),
      t(
        shown.scope === 'PERSONAL'
          ? 'financialEntries.form.scope.personal'
          : 'financialEntries.form.scope.professional',
      ),
    ),
  };

  const originAction: EntryDetailOriginAction | null = originKey
    ? {
        label: t(`financialEntries.detail.openOrigin.${originKey}`),
        unavailableHint: appointmentId
          ? null
          : t('financialEntries.detail.originUnavailable'),
        onPress: () => leave('origin'),
      }
    : null;

  const confirmDelete = async () => {
    const outcome = await deleter.remove(shown);
    if (outcome === 'deleted') {
      AccessibilityInfo.announceForAccessibility(
        t('financialEntries.detail.deleted'),
      );
      onChanged();
      leave('done');
    } else if (outcome === 'viaOrigin') {
      // O extrato estava desatualizado: o lançamento é automático. Sem origem
      // conhecida não há aviso para mostrar, então o extrato é recarregado.
      if (originKey) {
        leave('blockedDelete');
      } else {
        onChanged();
        leave('done');
      }
    }
  };

  const cancelDelete = () => {
    if (deleter.isDeleting) {
      return;
    }
    deleter.reset();
    leave('detail');
  };

  const finishEditing = (updated: FinancialEntry) => {
    // Salvar sem mudar nada não chega ao backend e devolve o mesmo lançamento.
    if (updated !== shown) {
      setShown(updated);
      AccessibilityInfo.announceForAccessibility(
        t('financialEntries.detail.updated'),
      );
      onChanged();
    }
    leave('detail');
  };

  const markGone = () => {
    entryIsGone.current = true;
    onChanged();
  };

  const closeOrigin = () => {
    onChanged();
    finish();
  };

  return (
    <>
      <EntryDetailSheet
        visible={step === 'detail'}
        title={shown.description}
        subtitle={t('financialEntries.detail.subtitle', {
          origin: t(`financialEntries.detail.origins.${originKey ?? 'manual'}`),
        })}
        automaticBadge={
          originKey ? t('financialEntries.detail.automatic') : null
        }
        fields={fields}
        lockedHint={
          originKey
            ? t(`financialEntries.detail.lockedHint.${originKey}`)
            : null
        }
        originAction={originAction}
        texts={{
          close: t('financialEntries.detail.close'),
          edit: t('financialEntries.detail.edit'),
          delete: t('financialEntries.detail.delete'),
        }}
        onEdit={() => leave('edit')}
        onDelete={() => {
          deleter.reset();
          leave(originKey ? 'blockedDelete' : 'confirmDelete');
        }}
        onClose={() => leave('done')}
        onClosed={continueAfterClose}
      />

      <NewEntryForm
        visible={step === 'edit'}
        entry={shown}
        onClose={() => leave(entryIsGone.current ? 'done' : 'detail')}
        onClosed={continueAfterClose}
        onSaved={finishEditing}
        onEntryGone={markGone}
      />

      <ConfirmDialog
        visible={step === 'confirmDelete'}
        title={t('financialEntries.detail.deleteConfirm.title')}
        message={t(
          deleter.failure ?? 'financialEntries.detail.deleteConfirm.message',
        )}
        confirmLabel={t(
          deleter.isDeleting
            ? 'financialEntries.detail.deleteConfirm.confirming'
            : 'financialEntries.detail.deleteConfirm.confirm',
        )}
        cancelLabel={t('financialEntries.detail.deleteConfirm.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        onClosed={continueAfterClose}
      />

      {originKey ? (
        <ConfirmDialog
          visible={step === 'blockedDelete'}
          icon={CircleAlert}
          tone="neutral"
          title={t('financialEntries.detail.deleteBlocked.title')}
          message={t(`financialEntries.detail.deleteBlocked.${originKey}`, {
            description: shown.description,
          })}
          confirmLabel={
            appointmentId
              ? t(`financialEntries.detail.openOrigin.${originKey}`)
              : t('financialEntries.detail.deleteBlocked.close')
          }
          confirmIcon={appointmentId ? ClipboardList : X}
          cancelLabel={
            appointmentId
              ? t('financialEntries.detail.deleteBlocked.close')
              : undefined
          }
          cancelAppearance="button"
          onConfirm={() => leave(appointmentId ? 'origin' : 'detail')}
          onCancel={() => leave('detail')}
          onClosed={continueAfterClose}
        />
      ) : null}

      <AppointmentDetailScreen
        appointmentId={step === 'origin' ? appointmentId : null}
        onClose={closeOrigin}
        onChanged={onChanged}
      />
    </>
  );
}

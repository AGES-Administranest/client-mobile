import { useEffect, useRef } from 'react';

import { useTranslation } from 'shared/i18n';

import { NewClinicSheet } from './NewClinicSheet';
import type { Client } from '../domain/client';
import { useClinicFormTexts } from '../hooks/useClinicFormTexts';
import { useNewClinicForm } from '../hooks/useNewClinicForm';

type NewClientSheetProps = {
  visible: boolean;
  initialName: string;
  onCreated: (client: Client) => void;
  onClose: () => void;
  onClosed?: () => void;
};

export function NewClientSheet({
  visible,
  initialName,
  onCreated,
  onClose,
  onClosed,
}: NewClientSheetProps) {
  const { t } = useTranslation();
  const form = useNewClinicForm();
  const { fieldTexts, toFieldErrors } = useClinicFormTexts();
  const { reset } = form;

  const wasVisible = useRef(false);

  // Só na abertura (false -> true): começa limpo, com o nome digitado.
  useEffect(() => {
    if (visible && !wasVisible.current) reset({ name: initialName });
    wasVisible.current = visible;
  }, [visible, initialName, reset]);

  const submit = async () => {
    const created = await form.submit();
    if (created) onCreated(created);
  };

  return (
    <NewClinicSheet
      visible={visible}
      draft={form.draft}
      fieldErrors={toFieldErrors(form.errors)}
      failureMessage={form.failure && t(form.failure)}
      isSaving={form.isSaving}
      title={t('clinics.newClinic.title')}
      fieldTexts={fieldTexts}
      confirmLabel={t('clinics.newClinic.confirm')}
      savingLabel={t('clinics.newClinic.saving')}
      closeLabel={t('clinics.newClinic.close')}
      onChangeField={form.setField}
      onSubmit={submit}
      onClose={onClose}
      onClosed={onClosed}
    />
  );
}
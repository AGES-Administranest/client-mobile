import { Check } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { ScreenHeader } from 'app/components/ui/screen-header';
import {
  CLINIC_FIELDS,
  NewClinicSheet,
  type ClinicDraftErrors,
  type ClinicField,
  type ClinicFieldTexts,
} from 'features/clinics';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { DuplicateInvoiceSheet } from '../components/DuplicateInvoiceSheet';
import { ServiceInvoiceReviewCard } from '../components/ServiceInvoiceReviewCard';
import { toDuplicateSummary } from '../domain/duplicateSummary';
import type { InitialReview } from '../domain/extractionToFormValues';
import type { ServiceInvoiceField } from '../domain/serviceInvoice.types';
import { useClientRegistration } from '../hooks/useClientRegistration';
import { useServiceInvoiceReview } from '../hooks/useServiceInvoiceReview';

type ServiceInvoiceReviewScreenProps = {
  visible: boolean;
  initial: InitialReview;
  onClose: () => void;
};

export function ServiceInvoiceReviewScreen({
  visible,
  initial,
  onClose,
}: ServiceInvoiceReviewScreenProps) {
  const { t } = useTranslation();
  const review = useServiceInvoiceReview({
    initialValues: initial.values,
    initialClient: initial.client,
    onConfirmed: onClose,
  });
  const registration = useClientRegistration({
    prefill: initial.newClientPrefill,
    onCreated: review.selectClient,
  });

  const [isLeaving, setIsLeaving] = useState(false);

  function requestClose() {
    if (review.isDirty) setIsLeaving(true);
    else onClose();
  }

  const fieldError = (field: ServiceInvoiceField): string | undefined => {
    const code = review.errors[field];
    return code
      ? t(`serviceInvoices.review.errors.${field}.${code}` as TranslationKey)
      : undefined;
  };

  const clinicFieldTexts = Object.fromEntries(
    CLINIC_FIELDS.map(field => [
      field,
      {
        label: t(`clinics.newClinic.fields.${field}.label`),
        placeholder: t(`clinics.newClinic.fields.${field}.placeholder`),
      },
    ]),
  ) as Record<ClinicField, ClinicFieldTexts>;

  const toClinicFieldErrors = (errors: ClinicDraftErrors) =>
    Object.fromEntries(
      Object.entries(errors).map(([field, code]) => [
        field,
        t(`clinics.newClinic.errors.${field}.${code}` as TranslationKey),
      ]),
    ) as Partial<Record<ClinicField, string>>;

  const newClinic = registration.form;

  return (
    <Fragment>
      <FullScreenModal
        visible={visible && registration.isReviewShown}
        onRequestClose={requestClose}
        onDismiss={registration.onReviewLeft}
      >
        <ScreenHeader
          title={t('serviceInvoices.review.title')}
          backLabel={t('serviceInvoices.review.back')}
          onBack={requestClose}
        />

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-4 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {initial.readFailed ? (
              <NoticeBanner
                tone="warning"
                message={t('serviceInvoices.review.readFailed')}
              />
            ) : (
              <NoticeBanner
                tone="info"
                message={t('serviceInvoices.review.checkData')}
              />
            )}

            <ServiceInvoiceReviewCard
              labels={{
                issueDate: t('serviceInvoices.review.fields.issueDate.label'),
                issueDatePlaceholder: t(
                  'serviceInvoices.review.fields.issueDate.placeholder',
                ),
                amount: t('serviceInvoices.review.fields.amount.label'),
                amountPlaceholder: t(
                  'serviceInvoices.review.fields.amount.placeholder',
                ),
                number: t('serviceInvoices.review.fields.number.label'),
                client: t('serviceInvoices.review.fields.client.label'),
                clientPlaceholder: t(
                  'serviceInvoices.review.fields.client.placeholder',
                ),
                suggestions: t('serviceInvoices.review.suggestions'),
                registerClient: t('serviceInvoices.review.registerClient'),
              }}
              issueDate={review.values.issueDate}
              issueDateError={fieldError('issueDate')}
              amount={review.values.amount}
              amountError={fieldError('amount')}
              number={review.values.number}
              client={{
                ...review.client,
                error: fieldError('clientId'),
                messages: {
                  loading: t('serviceInvoices.review.clientSearch.loading'),
                  error: t('serviceInvoices.review.clientSearch.error'),
                  empty: t('serviceInvoices.review.clientSearch.empty'),
                },
              }}
              onChangeIssueDate={review.changeIssueDate}
              onChangeAmount={review.changeAmount}
              onChangeNumber={review.changeNumber}
              onChangeClientTerm={review.changeClientTerm}
              onSelectClient={review.selectClient}
              onRegisterClient={registration.open}
            />

            {review.submitFailed ? (
              <NoticeBanner
                tone="alert"
                message={t('serviceInvoices.review.submitFailed')}
              />
            ) : null}
          </ScrollView>

          <View className="px-4 pb-4">
            <ActionButton
              label={
                review.isSubmitting
                  ? t('serviceInvoices.review.confirming')
                  : t('serviceInvoices.review.confirm')
              }
              icon={<Icon as={Check} size={16} />}
              disabled={review.isSubmitting}
              onPress={review.submit}
            />
          </View>
        </KeyboardAvoidingView>

        {review.duplicate ? (
          <DuplicateInvoiceSheet
            visible={review.duplicate.isOpen}
            view={review.duplicate.view}
            isSaving={review.isSubmitting}
            labels={{
              title: t('serviceInvoices.duplicate.title'),
              detailsTitle: t('serviceInvoices.duplicate.detailsTitle'),
              alert: t('serviceInvoices.duplicate.alert'),
              fields: {
                number: t('serviceInvoices.duplicate.fields.number'),
                issueDate: t('serviceInvoices.duplicate.fields.issueDate'),
                amount: t('serviceInvoices.duplicate.fields.amount'),
                client: t('serviceInvoices.duplicate.fields.client'),
              },
              viewExisting: t('serviceInvoices.duplicate.viewExisting'),
              saveAnyway: t('serviceInvoices.duplicate.saveAnyway'),
              saving: t('serviceInvoices.review.confirming'),
              cancel: t('serviceInvoices.duplicate.cancel'),
              back: t('serviceInvoices.duplicate.back'),
              close: t('serviceInvoices.duplicate.close'),
            }}
            summary={toDuplicateSummary(review.duplicate.note)}
            onViewExisting={review.viewDuplicate}
            onBack={review.backToDuplicateAlert}
            onSaveAnyway={review.saveDuplicateAnyway}
            onCancel={review.dismissDuplicate}
          />
        ) : null}

        <ConfirmSheet
          visible={isLeaving}
          title={t('serviceInvoices.review.leaveTitle')}
          message={t('serviceInvoices.review.leaveMessage')}
          confirmLabel={t('serviceInvoices.review.leaveConfirm')}
          cancelLabel={t('serviceInvoices.review.leaveCancel')}
          onConfirm={() => {
            setIsLeaving(false);
            onClose();
          }}
          onCancel={() => setIsLeaving(false)}
        />
      </FullScreenModal>

      <NewClinicSheet
        visible={visible && registration.isRegisterShown}
        draft={newClinic.draft}
        fieldErrors={toClinicFieldErrors(newClinic.errors)}
        failureMessage={newClinic.failure && t(newClinic.failure)}
        isSaving={newClinic.isSaving}
        title={t('serviceInvoices.review.registerClient')}
        fieldTexts={clinicFieldTexts}
        confirmLabel={t('clinics.newClinic.confirm')}
        savingLabel={t('clinics.newClinic.saving')}
        closeLabel={t('clinics.newClinic.close')}
        onChangeField={newClinic.setField}
        onSubmit={registration.submit}
        onClose={registration.cancel}
        onClosed={registration.onRegisterLeft}
      />
    </Fragment>
  );
}

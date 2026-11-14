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
  NewClinicSheet,
  useClientRegistration,
  useNewClinicSheetTexts,
} from 'features/clinics';
import { useTranslation, type TranslationKey } from 'shared/i18n';
import type { PickedPdf } from 'shared/services/pdfPicker';

import { DuplicateInvoiceSheet } from '../components/DuplicateInvoiceSheet';
import { ServiceInvoiceFormCard } from '../components/ServiceInvoiceFormCard';
import { toDuplicateSummary } from '../domain/duplicateSummary';
import type { InitialReview } from '../domain/extractionToFormValues';
import type { ServiceInvoiceField } from '../domain/serviceInvoice.types';
import { useServiceInvoiceReview } from '../hooks/useServiceInvoiceReview';

type ServiceInvoiceReviewScreenProps = {
  visible: boolean;
  invoiceId: string;
  initial: InitialReview;
  /** The PDF of a note typed by hand, which is saved on the device instead of confirmed. */
  manualFile?: PickedPdf | null;
  /** The person left without saving the note. */
  onClose: () => void;
  /** The note was confirmed, or saved on the device. */
  onConfirmed: () => void;
};

export function ServiceInvoiceReviewScreen({
  visible,
  invoiceId,
  initial,
  manualFile = null,
  onClose,
  onConfirmed,
}: ServiceInvoiceReviewScreenProps) {
  const { t } = useTranslation();
  const review = useServiceInvoiceReview({
    invoiceId,
    initialValues: initial.values,
    initialClient: initial.client,
    manualFile,
    onConfirmed,
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

  const newClinic = registration.form;
  const clinicSheet = useNewClinicSheetTexts(newClinic);

  const banner = (): { tone: 'warning' | 'info'; message: string } => {
    if (initial.readFailed) {
      return {
        tone: 'warning',
        message: t('serviceInvoices.review.readFailed'),
      };
    }
    if (manualFile) {
      return {
        tone: 'info',
        message: t('serviceInvoices.manual.banner', { file: manualFile.name }),
      };
    }
    return { tone: 'info', message: t('serviceInvoices.review.checkData') };
  };
  const { tone, message } = banner();

  const isManual = manualFile !== null;
  const submitLabelKey = (): TranslationKey => {
    if (review.isSubmitting) {
      return isManual
        ? 'serviceInvoices.manual.saving'
        : 'serviceInvoices.review.confirming';
    }
    return isManual
      ? 'serviceInvoices.manual.save'
      : 'serviceInvoices.review.confirm';
  };
  const failedKey: TranslationKey = isManual
    ? 'serviceInvoices.manual.saveFailed'
    : 'serviceInvoices.review.submitFailed';

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
            <NoticeBanner tone={tone} message={message} />

            <ServiceInvoiceFormCard
              labels={{
                issueDate: t('serviceInvoices.review.fields.issueDate.label'),
                issueDatePlaceholder: t(
                  'serviceInvoices.review.fields.issueDate.placeholder',
                ),
                amount: t('serviceInvoices.review.fields.amount.label'),
                amountPlaceholder: t(
                  'serviceInvoices.review.fields.amount.placeholder',
                ),
                client: t('serviceInvoices.review.fields.client.label'),
                clientPlaceholder: t(
                  'serviceInvoices.review.fields.client.placeholder',
                ),
              }}
              issueDate={review.values.issueDate}
              issueDateError={fieldError('issueDate')}
              amount={review.values.amount}
              amountError={fieldError('amount')}
              number={{
                label: t('serviceInvoices.review.fields.number.label'),
                value: review.values.number,
                onChange: review.changeNumber,
              }}
              client={{
                term: review.client.term,
                status: review.client.status,
                options: review.client.options,
                error: fieldError('clientId'),
                messages: {
                  loading: t('serviceInvoices.review.clientSearch.loading'),
                  error: t('serviceInvoices.review.clientSearch.error'),
                  empty: t('serviceInvoices.review.clientSearch.empty'),
                },
              }}
              suggestions={{
                label: t('serviceInvoices.review.suggestions'),
                options: review.client.suggestions,
              }}
              registerClient={{
                label: t('serviceInvoices.review.registerClient'),
                onPress: () => registration.open(),
              }}
              onChangeIssueDate={review.changeIssueDate}
              onChangeAmount={review.changeAmount}
              onChangeClientTerm={review.changeClientTerm}
              onSelectClient={review.selectClient}
            />

            {review.fileTooLarge ? (
              <NoticeBanner
                tone="alert"
                message={t('serviceInvoices.manual.fileTooLarge')}
              />
            ) : null}

            {review.submitFailed ? (
              <NoticeBanner tone="alert" message={t(failedKey)} />
            ) : null}
          </ScrollView>

          <View className="px-4 pb-4">
            <ActionButton
              label={t(submitLabelKey())}
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
        fieldErrors={clinicSheet.fieldErrors}
        failureMessage={clinicSheet.failureMessage}
        isSaving={newClinic.isSaving}
        title={t('serviceInvoices.review.registerClient')}
        fieldTexts={clinicSheet.fieldTexts}
        confirmLabel={clinicSheet.confirmLabel}
        savingLabel={clinicSheet.savingLabel}
        closeLabel={clinicSheet.closeLabel}
        onChangeField={newClinic.setField}
        onSubmit={registration.submit}
        onClose={registration.cancel}
        onClosed={registration.onRegisterLeft}
      />
    </Fragment>
  );
}

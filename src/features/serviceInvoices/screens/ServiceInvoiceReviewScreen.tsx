import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { ScreenHeader } from 'app/components/ui/screen-header';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { ServiceInvoiceReviewCard } from '../components/ServiceInvoiceReviewCard';
import type { InitialReview } from '../domain/extractionToFormValues';
import type {
  ServiceInvoiceErrors,
  ServiceInvoiceField,
} from '../domain/serviceInvoice.types';
import { useServiceInvoiceReview } from '../hooks/useServiceInvoiceReview';

type FieldErrorKeys = {
  [Field in ServiceInvoiceField]: Record<
    NonNullable<ServiceInvoiceErrors[Field]>,
    TranslationKey
  >;
};

const FIELD_ERROR_KEYS: FieldErrorKeys = {
  issueDate: {
    required: 'serviceInvoices.review.errors.issueDate.required',
    invalid: 'serviceInvoices.review.errors.issueDate.invalid',
    future: 'serviceInvoices.review.errors.issueDate.future',
  },
  amount: {
    required: 'serviceInvoices.review.errors.amount.required',
    invalid: 'serviceInvoices.review.errors.amount.invalid',
    mustBePositive: 'serviceInvoices.review.errors.amount.mustBePositive',
  },
  clientId: {
    required: 'serviceInvoices.review.errors.clientId.required',
  },
};

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
    onConfirmed: onClose,
  });

  const [isLeaving, setIsLeaving] = useState(false);

  function requestClose() {
    if (review.isDirty) setIsLeaving(true);
    else onClose();
  }

  const fieldError = (field: ServiceInvoiceField): string | undefined => {
    const code = review.errors[field];
    if (!code) return undefined;
    const keys: Record<string, TranslationKey> = FIELD_ERROR_KEYS[field];
    return t(keys[code]);
  };

  return (
    <FullScreenModal visible={visible} onRequestClose={requestClose}>
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
  );
}

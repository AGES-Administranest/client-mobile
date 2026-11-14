import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Button } from 'app/components/ui/button';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { Icon } from 'app/components/ui/icon';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { ScreenHeader } from 'app/components/ui/screen-header';
import { Text } from 'app/components/ui/text';
import { useTranslation, type TranslationKey } from 'shared/i18n';

import { InvoiceFileCard } from '../components/InvoiceFileCard';
import { ServiceInvoiceFormCard } from '../components/ServiceInvoiceFormCard';
import type { ServiceInvoiceField } from '../domain/serviceInvoice.types';
import { formatFileSize } from '../domain/serviceInvoiceList';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import { useServiceInvoiceCorrection } from '../hooks/useServiceInvoiceCorrection';
import { useServiceInvoiceDownload } from '../hooks/useServiceInvoiceDownload';

type ServiceInvoiceCorrectionScreenProps = {
  record: ServiceInvoiceRecord;
  onCancel: () => void;
  onCorrected: () => void;
};

export function ServiceInvoiceCorrectionScreen({
  record,
  onCancel,
  onCorrected,
}: ServiceInvoiceCorrectionScreenProps) {
  const { t, locale } = useTranslation();
  const correction = useServiceInvoiceCorrection({
    record,
    onCorrected,
  });
  const download = useServiceInvoiceDownload({ record });
  const [isLeaving, setIsLeaving] = useState(false);

  function requestClose() {
    if (correction.isDirty) setIsLeaving(true);
    else onCancel();
  }

  const fieldError = (field: ServiceInvoiceField): string | undefined => {
    const code = correction.errors[field];
    return code
      ? t(`serviceInvoices.review.errors.${field}.${code}` as TranslationKey)
      : undefined;
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t('serviceInvoices.records.correction.title')}
        backLabel={t('serviceInvoices.records.correction.back')}
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
          <NoticeBanner
            tone="info"
            message={t('serviceInvoices.records.correction.checkPdf')}
          />

          <InvoiceFileCard
            fileName={
              record.file?.name ??
              t('serviceInvoices.records.detail.fileFallbackName')
            }
            fileDetails={
              record.file
                ? `PDF · ${formatFileSize(record.file.bytesSize, locale)}`
                : 'PDF'
            }
            status={record.syncStatus}
            availability={download.availability}
            isDownloading={download.status === 'requesting'}
            downloadFailed={download.status === 'failed'}
            texts={{
              download: t('serviceInvoices.records.detail.download'),
              downloading: t('serviceInvoices.records.detail.downloading'),
              saved: t('serviceInvoices.records.detail.saved'),
              statusLabel: t('serviceInvoices.records.status.SYNCED'),
              unavailable: {
                needsConnection: t(
                  'serviceInvoices.records.detail.unavailable.needsConnection',
                ),
                notSentYet: t(
                  'serviceInvoices.records.detail.unavailable.notSentYet',
                ),
                noFile: t('serviceInvoices.records.detail.unavailable.noFile'),
              },
              downloadFailed: t(
                'serviceInvoices.records.detail.downloadFailed',
              ),
            }}
            isSaved={download.status === 'saved'}
            onDownload={download.save}
          />

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
            issueDate={correction.values.issueDate}
            issueDateError={fieldError('issueDate')}
            amount={correction.values.amount}
            amountError={fieldError('amount')}
            client={{
              ...correction.client,
              error: fieldError('clientId'),
              messages: {
                loading: t('serviceInvoices.review.clientSearch.loading'),
                error: t('serviceInvoices.review.clientSearch.error'),
                empty: t('serviceInvoices.review.clientSearch.empty'),
              },
            }}
            location={{
              label: t('serviceInvoices.records.correction.location.label'),
              placeholder: t(
                'serviceInvoices.records.correction.location.placeholder',
              ),
              value: correction.location,
              onChange: correction.changeLocation,
            }}
            onChangeIssueDate={correction.changeIssueDate}
            onChangeAmount={correction.changeAmount}
            onChangeClientTerm={correction.changeClientTerm}
            onSelectClient={correction.selectClient}
          />

          {correction.failure ? (
            <NoticeBanner
              tone="alert"
              message={t(
                `serviceInvoices.records.correction.failure.${correction.failure}` as TranslationKey,
              )}
            />
          ) : null}
        </ScrollView>

        <View className="gap-2 px-4 pb-4">
          <ActionButton
            label={t(
              correction.isSubmitting
                ? 'serviceInvoices.records.correction.confirming'
                : 'serviceInvoices.records.correction.confirm',
            )}
            icon={<Icon as={Check} size={16} />}
            disabled={correction.isSubmitting}
            onPress={correction.submit}
          />
          <Button
            shape="pill"
            variant="outline"
            disabled={correction.isSubmitting}
            className="h-[46px] w-full"
            onPress={requestClose}
          >
            <Text className="font-semibold">
              {t('serviceInvoices.records.correction.cancel')}
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={isLeaving}
        title={t('serviceInvoices.records.correction.leaveTitle')}
        message={t('serviceInvoices.records.correction.leaveMessage')}
        confirmLabel={t('serviceInvoices.records.correction.leaveConfirm')}
        cancelLabel={t('serviceInvoices.records.correction.leaveCancel')}
        onConfirm={() => {
          setIsLeaving(false);
          onCancel();
        }}
        onCancel={() => setIsLeaving(false)}
      />
    </View>
  );
}

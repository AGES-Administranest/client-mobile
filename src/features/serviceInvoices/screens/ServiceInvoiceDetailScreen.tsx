import {
  Calculator,
  Check,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { ScreenHeader } from 'app/components/ui/screen-header';
import { StatusDialog } from 'app/components/ui/status-dialog';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { STATUS_LABEL_KEYS } from './invoiceStatusLabelKeys';
import { InvoiceDataCard } from '../components/InvoiceDataCard';
import { InvoiceDeleteList } from '../components/InvoiceDeleteList';
import { InvoiceFileCard } from '../components/InvoiceFileCard';
import {
  formatFileSize,
  formatInvoiceDate,
} from '../domain/serviceInvoiceList';
import type { ServiceInvoiceRecord } from '../domain/serviceInvoiceRecord.types';
import { useServiceInvoiceDeletion } from '../hooks/useServiceInvoiceDeletion';
import { useServiceInvoiceDownload } from '../hooks/useServiceInvoiceDownload';
import { useServiceInvoiceRecord } from '../hooks/useServiceInvoiceRecord';

type ServiceInvoiceDetailScreenProps = {
  invoiceId: string;
  onBack: () => void;
  onCorrect: (record: ServiceInvoiceRecord) => void;
  onDeleted: () => void;
};

export function ServiceInvoiceDetailScreen({
  invoiceId,
  onBack,
  onCorrect,
  onDeleted,
}: ServiceInvoiceDetailScreenProps) {
  const { t, locale } = useTranslation();
  const note = useServiceInvoiceRecord(invoiceId);
  const download = useServiceInvoiceDownload({
    record: note.record,
    knownOffline: note.isOffline,
  });
  const deletion = useServiceInvoiceDeletion({
    record: note.record,
    onDeleted,
  });
  const { record } = note;

  const canCorrect =
    record !== null && record.syncStatus === 'SYNCED' && !note.isOffline;
  const isSynced = record?.syncStatus === 'SYNCED';

  const fileTexts = {
    download: t('serviceInvoices.records.detail.download'),
    downloading: t('serviceInvoices.records.detail.downloading'),
    saved: t('serviceInvoices.records.detail.saved'),
    statusLabel: record ? t(STATUS_LABEL_KEYS[record.syncStatus]) : '',
    unavailable: {
      needsConnection: t(
        'serviceInvoices.records.detail.unavailable.needsConnection',
      ),
      notSentYet: t('serviceInvoices.records.detail.unavailable.notSentYet'),
      noFile: t('serviceInvoices.records.detail.unavailable.noFile'),
    },
    downloadFailed: t('serviceInvoices.records.detail.downloadFailed'),
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        title={t('serviceInvoices.records.detail.title')}
        backLabel={t('serviceInvoices.records.detail.back')}
        onBack={onBack}
      />

      {note.status === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel={t('common.loading')}
          className="py-10"
        />
      ) : null}

      {note.status === 'notFound' || note.status === 'error' ? (
        <View className="mx-4 items-center gap-3 rounded-2xl bg-white px-6 py-8">
          <Text className="text-center text-[13px] text-label-tertiary">
            {note.status === 'notFound'
              ? t('serviceInvoices.records.detail.notFound')
              : t('serviceInvoices.records.detail.loadFailed')}
          </Text>
          <Button
            shape="pill"
            size="sm"
            className="h-8 px-3.5"
            onPress={note.status === 'notFound' ? onBack : note.reload}
          >
            <Text className="text-xs font-semibold">
              {note.status === 'notFound'
                ? t('serviceInvoices.records.detail.back')
                : t('common.retry')}
            </Text>
          </Button>
        </View>
      ) : null}

      {note.status === 'ready' && record ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-6"
        >
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
            texts={fileTexts}
            isSaved={download.status === 'saved'}
            onDownload={download.save}
          />

          <Text className="text-lg font-bold text-label-primary">
            {t('serviceInvoices.records.detail.dataTitle')}
          </Text>
          <InvoiceDataCard
            rows={[
              {
                label: t('serviceInvoices.records.detail.fields.issueDate'),
                value: formatInvoiceDate(record.issueDate),
              },
              ...(record.number
                ? [
                    {
                      label: t('serviceInvoices.records.detail.fields.number'),
                      value: record.number,
                    },
                  ]
                : []),
              {
                label: t('serviceInvoices.records.detail.fields.client'),
                value: record.clientName,
              },
              ...(record.clientTaxId
                ? [
                    {
                      label: t(
                        'serviceInvoices.records.detail.fields.clientTaxId',
                      ),
                      value: record.clientTaxId,
                    },
                  ]
                : []),
              ...(record.location
                ? [
                    {
                      label: t(
                        'serviceInvoices.records.detail.fields.location',
                      ),
                      value: record.location,
                    },
                  ]
                : []),
              {
                label: t('serviceInvoices.records.detail.fields.amount'),
                value: formatCurrency(record.amount, locale),
                emphasized: true,
              },
            ]}
          />

          <Text className="text-xs text-label-tertiary">
            {t('serviceInvoices.records.detail.checkData')}
          </Text>

          {canCorrect ? null : (
            <NoticeBanner
              tone="info"
              message={t(
                isSynced
                  ? 'serviceInvoices.records.detail.correctNeedsConnection'
                  : 'serviceInvoices.records.detail.correctNotSentYet',
              )}
            />
          )}

          <View className="flex-row gap-3">
            <Button
              shape="pill"
              variant="outline"
              icon={Pencil}
              disabled={!canCorrect}
              className="h-[46px] flex-1"
              onPress={() => onCorrect(record)}
            >
              <Text className="font-semibold">
                {t('serviceInvoices.records.detail.correct')}
              </Text>
            </Button>
            <Button
              shape="pill"
              variant="destructive"
              icon={Trash2}
              className="h-[46px] flex-1"
              onPress={deletion.request}
            >
              <Text className="font-semibold">
                {t('serviceInvoices.records.detail.delete')}
              </Text>
            </Button>
          </View>
        </ScrollView>
      ) : null}

      <StatusDialog
        visible={deletion.step === 'confirming' || deletion.step === 'deleting'}
        tone="danger"
        icon={Trash2}
        title={t('serviceInvoices.records.delete.title')}
        message={t(
          isSynced
            ? 'serviceInvoices.records.delete.message'
            : 'serviceInvoices.records.delete.messagePending',
        )}
        primary={{
          label: t(
            deletion.step === 'deleting'
              ? 'serviceInvoices.records.delete.deleting'
              : 'serviceInvoices.records.delete.confirm',
          ),
          onPress: deletion.confirm,
          disabled: deletion.step === 'deleting',
        }}
        secondary={{
          label: t('serviceInvoices.records.delete.cancel'),
          onPress: deletion.cancel,
          disabled: deletion.step === 'deleting',
        }}
        onRequestClose={deletion.cancel}
      >
        <View className="gap-3">
          <InvoiceDeleteList
            items={[
              {
                icon: FileText,
                label: t('serviceInvoices.records.delete.pdfItem'),
              },
              ...(isSynced
                ? [
                    {
                      icon: Calculator,
                      label: t('serviceInvoices.records.delete.entryItem'),
                    },
                  ]
                : []),
            ]}
          />
          {deletion.failed ? (
            <NoticeBanner
              tone="alert"
              message={t('serviceInvoices.records.delete.failed')}
            />
          ) : null}
        </View>
      </StatusDialog>

      <StatusDialog
        visible={deletion.step === 'done'}
        tone="success"
        icon={Check}
        title={t('serviceInvoices.records.delete.doneTitle')}
        message={
          deletion.queuedOffline
            ? t('serviceInvoices.records.delete.doneQueued')
            : undefined
        }
        primary={{
          label: t('serviceInvoices.records.delete.understood'),
          onPress: deletion.acknowledge,
        }}
        onRequestClose={deletion.acknowledge}
      />
    </View>
  );
}

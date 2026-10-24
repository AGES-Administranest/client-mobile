import { ArrowLeft, Check, Eye, X } from 'lucide-react-native';
import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';

type DuplicateInvoiceSheetProps = {
  visible: boolean;
  view: 'alert' | 'details';
  isSaving: boolean;
  labels: {
    title: string;
    detailsTitle: string;
    alert: string;
    fields: {
      number: string;
      issueDate: string;
      amount: string;
      client: string;
    };
    viewExisting: string;
    saveAnyway: string;
    saving: string;
    cancel: string;
    back: string;
    close: string;
  };
  summary: {
    number: string;
    issueDate: string;
    amount: string;
    clientName: string;
  };
  onViewExisting: () => void;
  onBack: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
};

export function DuplicateInvoiceSheet({
  visible,
  view,
  isSaving,
  labels,
  summary,
  onViewExisting,
  onBack,
  onSaveAnyway,
  onCancel,
}: DuplicateInvoiceSheetProps) {
  const saveLabel = isSaving ? labels.saving : labels.saveAnyway;
  const rows: [string, string][] = [
    [labels.fields.number, summary.number],
    [labels.fields.issueDate, summary.issueDate],
    [labels.fields.amount, summary.amount],
    [labels.fields.client, summary.clientName],
  ];

  return (
    <BottomSheet
      visible={visible}
      title={view === 'alert' ? labels.title : labels.detailsTitle}
      closeLabel={labels.close}
      onClose={onCancel}
      footer={
        view === 'alert' ? (
          <>
            <Button
              shape="pill"
              icon={Check}
              className="h-[49px] w-full"
              disabled={isSaving}
              onPress={onSaveAnyway}
            >
              <Text className="font-semibold">{saveLabel}</Text>
            </Button>
            <Button
              shape="pill"
              variant="outline"
              icon={Eye}
              className="h-[49px] w-full border-border-primary bg-white"
              disabled={isSaving}
              onPress={onViewExisting}
            >
              <Text className="font-semibold text-label-primary">
                {labels.viewExisting}
              </Text>
            </Button>
            <Button
              shape="pill"
              variant="outline"
              icon={X}
              className="h-[49px] w-full border-border-primary bg-white"
              disabled={isSaving}
              onPress={onCancel}
            >
              <Text className="font-semibold text-label-primary">
                {labels.cancel}
              </Text>
            </Button>
          </>
        ) : (
          <Button
            shape="pill"
            icon={ArrowLeft}
            className="h-[49px] w-full"
            onPress={onBack}
          >
            <Text className="font-semibold">{labels.back}</Text>
          </Button>
        )
      }
    >
      {view === 'alert' ? (
        <NoticeBanner tone="warning" message={labels.alert} />
      ) : null}
      <Card className="gap-3">
        {rows
          .filter(([, value]) => value !== '')
          .map(([label, value]) => (
            <View key={label} className="gap-1">
              <Text className="text-xs font-semibold uppercase text-label-primary">
                {label}
              </Text>
              <Text className="text-[15px] text-label-primary">{value}</Text>
            </View>
          ))}
      </Card>
    </BottomSheet>
  );
}

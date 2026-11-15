import { FlatList, View } from 'react-native';

import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { ModalHeader } from 'app/components/ui/modal-header';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportCard } from '../components/ReportCard';
import type { ReportHistoryItem } from '../domain/report.types';

type ReportHistoryScreenProps = {
  visible: boolean;
  items: readonly ReportHistoryItem[];
  shareError?: string | null;
  onClose: () => void;
  shareActionOf: (report: ReportHistoryItem) => (() => void) | undefined;
};

function Separator() {
  return <View className="h-3" />;
}

export function ReportHistoryScreen({
  visible,
  items,
  shareError,
  onClose,
  shareActionOf,
}: ReportHistoryScreenProps) {
  const { t, locale } = useTranslation();

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <ModalHeader
        title={t('reports.history.title')}
        backLabel={t('reports.history.back')}
        onBack={onClose}
      />
      <FlatList
        data={items}
        keyExtractor={report => report.id}
        renderItem={({ item }) => (
          <ReportCard
            className="w-full"
            date={formatDayAndMonth(new Date(item.generatedAt), locale, true)}
            fileName={item.fileName}
            onPress={shareActionOf(item)}
          />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerClassName="px-4 pb-6 pt-4"
      />
      {shareError ? (
        <Text
          accessibilityRole="alert"
          className="px-4 pb-6 text-sm text-label-tertiary"
        >
          {shareError}
        </Text>
      ) : null}
    </FullScreenModal>
  );
}

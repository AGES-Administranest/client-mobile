import { ArrowLeft } from 'lucide-react-native';
import { FlatList, Pressable, View } from 'react-native';

import { FullScreenModal } from 'app/components/ui/full-screen-modal';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportCard } from '../components/ReportCard';
import type { ReportHistoryItem } from '../domain/report.types';

type ReportHistoryScreenProps = {
  visible: boolean;
  items: readonly ReportHistoryItem[];
  onClose: () => void;
  onSelect: (report: ReportHistoryItem) => void;
};

function Separator() {
  return <View className="h-3" />;
}

export function ReportHistoryScreen({
  visible,
  items,
  onClose,
  onSelect,
}: ReportHistoryScreenProps) {
  const { t, locale } = useTranslation();

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose}>
      <View className="h-11 flex-row items-center justify-center px-4">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('invoices.back')}
          className="absolute left-4 size-9 items-center justify-center rounded-full bg-primary"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-[13px] font-semibold uppercase tracking-wide text-label-primary"
        >
          {t('reports.history.title')}
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={report => report.id}
        renderItem={({ item }) => (
          <ReportCard
            className="w-full"
            date={formatDayAndMonth(new Date(item.generatedAt), locale, true)}
            fileName={item.fileName}
            onPress={() => onSelect(item)}
          />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerClassName="px-4 pb-6 pt-4"
      />
    </FullScreenModal>
  );
}

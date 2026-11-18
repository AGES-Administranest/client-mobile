import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from 'app/components/ui/back-button';
import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { Text } from 'app/components/ui/text';
import { MIN_SCREEN_TOP } from 'app/lib/layout';
import { useTranslation } from 'shared/i18n';
import { LEGAL_TEXTS, type LegalDocument } from 'shared/legal/content';

type LegalDocumentModalProps = {
  document: LegalDocument | null;
  onClose: () => void;
};

export function LegalDocumentModal({
  document,
  onClose,
}: LegalDocumentModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Keep the last text while the slide-out animation runs.
  const text = LEGAL_TEXTS[document ?? 'termsOfUse'];

  return (
    <SlideInModal visible={document !== null} onRequestClose={onClose}>
      <View
        className="flex-1"
        style={{
          paddingTop: Math.max(insets.top, MIN_SCREEN_TOP),
          paddingBottom: insets.bottom,
        }}
      >
        <View className="h-11 flex-row items-center gap-3 px-5">
          <BackButton label={t('profile.back')} onPress={onClose} />
          <Text
            accessibilityRole="header"
            className="text-[26px] font-bold leading-[30px] text-label-primary"
          >
            {text.title}
          </Text>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-5 pb-6 pt-6"
        >
          <Text className="text-sm text-label-tertiary">{text.updated}</Text>
          {text.sections.map(section => (
            <View key={section.heading} className="gap-2 pt-2">
              <Text className="text-base font-bold text-label-primary">
                {section.heading}
              </Text>
              {section.paragraphs.map(paragraph => (
                <Text
                  key={paragraph}
                  className="text-sm leading-5 text-label-primary"
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SlideInModal>
  );
}

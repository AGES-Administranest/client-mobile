import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { BackgroundPrimary } from 'theme/colors';

import { FixedCostsSection } from './FixedCostsSection';

type CalculatorScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function CalculatorScreen({ visible, onClose }: CalculatorScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          style={StyleSheet.absoluteFill}
        />

        <View className="gap-4 px-4 pb-2 pt-3">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('calculator.back')}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <Icon as={ArrowLeft} className="size-4 text-white" />
          </Pressable>

          <View className="gap-[3px] px-1">
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-label-primary"
            >
              {t('calculator.title')}
            </Text>
            <Text className="text-[13px] text-label-primary">
              {t('calculator.subtitle')}
            </Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-[18px] px-5 pb-10 pt-2"
        >
          <FixedCostsSection />
        </ScrollView>
      </View>
    </Modal>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { monthOf } from 'shared/utils/monthPeriod';
import { BackgroundPrimary } from 'theme/colors';

import { HourlyRateResultView } from './HourlyRateResultView';
import { PricingSetupView } from './PricingSetupView';
import { PricingOnboarding } from '../components/PricingOnboarding';
import { useHourlyRate } from '../hooks/useHourlyRate';

const SLIDE_MS = 280;
// Browsers report no top inset, which left the back button on the edge.
const MIN_TOP_PADDING = 16;

const styles = StyleSheet.create({ fill: { flex: 1 } });

type HourlyRateScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function HourlyRateScreen({ visible, onClose }: HourlyRateScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The Modal's own "slide" always rises from the bottom; the calculator
  // enters from the right like a pushed screen, so the Modal is kept mounted
  // (and transparent) while the content slides.
  const [mounted, setMounted] = useState(visible);
  const offset = useRef(new Animated.Value(visible ? 0 : width)).current;

  useEffect(() => {
    const animation = Animated.timing(offset, {
      toValue: visible ? 0 : width,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    if (visible) {
      setMounted(true);
      offset.setValue(width);
    }
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, width, offset]);

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* style, not className: Animated.View does not take NativeWind's. */}
      <Animated.View
        style={[
          styles.fill,
          {
            paddingTop: Math.max(insets.top, MIN_TOP_PADDING),
            paddingBottom: insets.bottom,
            transform: [{ translateX: offset }],
          },
        ]}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <HourlyRateContent onClose={onClose} />
      </Animated.View>
    </Modal>
  );
}

// Lives inside the Modal, so each opening starts on the current month and
// only fetches while the calculator is on screen.
function HourlyRateContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { state, reload } = useHourlyRate(month);

  const goBack = isConfiguring ? () => setIsConfiguring(false) : onClose;

  return (
    <>
      <View className="gap-3 px-[15px] pb-2 pt-0">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('calculator.back')}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="px-[7px]">
          <Text
            accessibilityRole="header"
            className="text-xl font-bold leading-[30px] tracking-[-0.2px] text-label-primary"
          >
            {t(isConfiguring ? 'pricing.setup.title' : 'calculator.title')}
          </Text>
          <Text className="text-[13px] leading-[19.5px] text-label-primary">
            {t(
              isConfiguring ? 'pricing.setup.subtitle' : 'calculator.subtitle',
            )}
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-[18px] px-[22px] pb-10 pt-2.5"
      >
        {isConfiguring ? (
          <PricingSetupView
            month={month}
            onSaved={() => {
              reload();
              setIsConfiguring(false);
            }}
          />
        ) : state.status === 'loading' ? (
          <View
            accessibilityLabel={t('pricing.hourlyRate.loading')}
            className="items-center py-10"
          >
            <ActivityIndicator />
          </View>
        ) : state.status === 'error' ? (
          <View className="items-center gap-2 py-10">
            <Text className="text-center text-sm text-alert-primary">
              {t('pricing.hourlyRate.loadFailure')}
            </Text>
            <Pressable accessibilityRole="button" onPress={reload}>
              <Text className="text-[13px] font-semibold text-label-quartenery">
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : state.status === 'unconfigured' ? (
          <PricingOnboarding
            title={t('pricing.onboarding.title')}
            message={t('pricing.onboarding.message')}
            goals={{
              monthlyIncomeGoal: {
                title: t('pricing.onboarding.goals.monthlyIncomeGoal.title'),
                caption: t(
                  'pricing.onboarding.goals.monthlyIncomeGoal.caption',
                ),
              },
              weeklyHours: {
                title: t('pricing.onboarding.goals.weeklyHours.title'),
                caption: t('pricing.onboarding.goals.weeklyHours.caption'),
              },
              safetyMarginPct: {
                title: t('pricing.onboarding.goals.safetyMarginPct.title'),
                caption: t('pricing.onboarding.goals.safetyMarginPct.caption'),
              },
            }}
            actionLabel={t('pricing.onboarding.action')}
            onConfigure={() => setIsConfiguring(true)}
            footnote={t('pricing.onboarding.footnote')}
          />
        ) : (
          <HourlyRateResultView
            month={month}
            onMonthChange={setMonth}
            hourlyRate={state.hourlyRate}
            isRefreshing={state.isRefreshing}
            onChanged={reload}
          />
        )}
      </ScrollView>
    </>
  );
}

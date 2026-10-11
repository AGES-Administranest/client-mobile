import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Car, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useAuth } from 'features/auth';
import { useTranslation } from 'shared/i18n';
import { BackgroundPrimary } from 'theme/colors';

import { VehicleCard } from '../components/VehicleCard';
import type { Vehicle } from '../domain/vehicle.types';
import { fetchVehicles } from '../services/vehicleService';

export type VehiclesScreenProps = {
  visible: boolean;
  onClose: () => void;
  vehicles?: Vehicle[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onAddVehicle?: () => void;
};

function useSessionToken(): string | undefined {
  try {
    const auth = useAuth();
    return auth.session?.idToken;
  } catch {
    return undefined;
  }
}

export function VehiclesScreen({
  visible,
  onClose,
  vehicles: initialVehicles,
  onSelectVehicle,
  onAddVehicle,
}: VehiclesScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const token = useSessionToken();

  const [internalVehicles, setInternalVehicles] = useState<Vehicle[]>([]);
  const [, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (initialVehicles !== undefined) {
      setInternalVehicles(initialVehicles);
      return;
    }

    if (!token) return;

    let mounted = true;
    setIsLoading(true);

    fetchVehicles(token)
      .then(data => {
        if (mounted) {
          setInternalVehicles(data);
        }
      })
      .catch(() => {
        // Falhas de rede mantêm a lista atual
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [visible, initialVehicles, token]);

  const vehicleList = initialVehicles ?? internalVehicles;
  const count = vehicleList.length;

  const counterText =
    count === 1
      ? t('vehicles.counterSingular', { count })
      : t('vehicles.counterPlural', { count });

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

        {/* Cabeçalho */}
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('vehicles.back')}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <Icon as={ArrowLeft} size={18} className="text-white" />
          </Pressable>

          <Text
            accessibilityRole="header"
            className="flex-1 pr-9 text-center text-sm font-bold tracking-wider text-label-primary"
          >
            {counterText}
          </Text>
        </View>

        {/* Conteúdo / Lista */}
        {vehicleList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <EmptyState icon={Car} message={t('vehicles.empty')} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4"
            contentContainerClassName="gap-3 pb-28 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {vehicleList.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onPress={() => onSelectVehicle?.(vehicle)}
              />
            ))}
          </ScrollView>
        )}

        {/* Botão Fixo Inferior */}
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Button
            shape="pill"
            size="lg"
            className="h-[49px] w-full flex-row items-center justify-center gap-2 bg-button-primary active:opacity-90"
            onPress={onAddVehicle}
            accessibilityRole="button"
            accessibilityLabel={t('vehicles.addVehicle')}
          >
            <Icon as={Plus} size={18} className="text-white" />
            <Text className="text-base font-semibold text-white">
              {t('vehicles.addVehicle')}
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

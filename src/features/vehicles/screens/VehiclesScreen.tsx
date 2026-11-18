import { LinearGradient } from 'expo-linear-gradient';
import { Car, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from 'app/components/ui/back-button';
import { Button } from 'app/components/ui/button';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { Text } from 'app/components/ui/text';
import { MIN_SCREEN_BOTTOM, MIN_SCREEN_TOP } from 'app/lib/layout';
import { useAuth } from 'features/auth';
import { useTranslation } from 'shared/i18n';
import { BackgroundPrimary } from 'theme/colors';

import { VehicleCard } from '../components/VehicleCard';
import {
  VehicleFormSheet,
  type VehicleFormTexts,
} from '../components/VehicleFormSheet';
import type { Vehicle, VehicleFormMode } from '../domain/vehicle.types';
import { useVehicleForm } from '../hooks/useVehicleForm';
import { useVehicles } from '../hooks/useVehicles';

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

  const vehiclesHook = useVehicles({
    token,
    autoFetch: visible && initialVehicles === undefined,
  });

  const [internalVehicles, setInternalVehicles] = useState<Vehicle[]>(
    initialVehicles ?? [],
  );

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [sheetMode, setSheetMode] = useState<VehicleFormMode>('create');
  const [confirmInactivateVisible, setConfirmInactivateVisible] =
    useState(false);

  const form = useVehicleForm({
    vehicle: selectedVehicle,
    mode: sheetMode,
    token,
    onSuccess: savedVehicle => {
      if (sheetMode === 'create') {
        setInternalVehicles(prev => [savedVehicle, ...prev]);
        vehiclesHook.setVehicles(prev => [savedVehicle, ...prev]);
      } else {
        setInternalVehicles(prev =>
          prev.map(v => (v.id === savedVehicle.id ? savedVehicle : v)),
        );
        vehiclesHook.setVehicles(prev =>
          prev.map(v => (v.id === savedVehicle.id ? savedVehicle : v)),
        );
      }
      setSheetVisible(false);
    },
    onInactivateSuccess: vehicleId => {
      setInternalVehicles(prev => prev.filter(v => v.id !== vehicleId));
      vehiclesHook.setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      setConfirmInactivateVisible(false);
      setSheetVisible(false);
    },
  });

  useEffect(() => {
    if (initialVehicles === undefined) {
      setInternalVehicles(vehiclesHook.vehicles);
    }
  }, [initialVehicles, vehiclesHook.vehicles]);

  const vehicleList = internalVehicles;
  const count = vehicleList.length;
  const showsEmptyAction =
    count === 0 && !vehiclesHook.isLoading && !vehiclesHook.error;

  const counterText =
    count === 1
      ? t('vehicles.counterSingular', { count })
      : t('vehicles.counterPlural', { count });

  function handleOpenAdd() {
    onAddVehicle?.();
    setSelectedVehicle(null);
    setSheetMode('create');
    form.reset(null, 'create');
    setSheetVisible(true);
  }

  function handleOpenView(vehicle: Vehicle) {
    onSelectVehicle?.(vehicle);
    setSelectedVehicle(vehicle);
    setSheetMode('view');
    form.reset(vehicle, 'view');
    setSheetVisible(true);
  }

  function handleStartEdit() {
    setSheetMode('edit');
    form.setMode('edit');
  }

  const formTexts: VehicleFormTexts = {
    title: t('vehicles.form.title'),
    close: t('vehicles.form.close'),
    labels: {
      brand: t('vehicles.form.brand'),
      model: t('vehicles.form.model'),
      fuelType: t('vehicles.form.fuelType'),
      avgConsumptionKmL: t('vehicles.form.avgConsumption'),
      fuelPrice: t('vehicles.form.fuelPrice'),
    },
    placeholders: {
      brand: t('vehicles.form.brandPlaceholder'),
      model: t('vehicles.form.modelPlaceholder'),
      avgConsumptionKmL: t('vehicles.form.avgConsumptionPlaceholder'),
      fuelPrice: t('vehicles.form.fuelPricePlaceholder'),
    },
    fuelTypes: {
      GASOLINE: t('vehicles.fuelTypes.gasoline'),
      ETHANOL: t('vehicles.fuelTypes.ethanol'),
      DIESEL: t('vehicles.fuelTypes.diesel'),
      FLEX: t('vehicles.fuelTypes.flex'),
    },
    estimatedCostTitle: t('vehicles.form.estimatedCost'),
    estimatedCostValue: t('vehicles.form.estimatedCostPreview', {
      cost:
        form.costPerKmEstimate !== null
          ? form.costPerKmEstimate.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0,00',
    }),
    buttons: {
      add: t('vehicles.form.submitAdd'),
      edit: t('vehicles.form.submitEdit'),
      confirm: t('vehicles.form.submitConfirm'),
      inactivate: t('vehicles.form.inactivate'),
    },
    errors: {
      brandRequired: t('vehicles.form.errors.brandRequired'),
      brandMaxLength: t('vehicles.form.errors.brandMaxLength'),
      modelRequired: t('vehicles.form.errors.modelRequired'),
      modelMaxLength: t('vehicles.form.errors.modelMaxLength'),
      fuelTypeInvalid: t('vehicles.form.errors.fuelTypeInvalid'),
      avgConsumptionRequired: t('vehicles.form.errors.avgConsumptionRequired'),
      avgConsumptionInvalid: t('vehicles.form.errors.avgConsumptionInvalid'),
      fuelPriceRequired: t('vehicles.form.errors.fuelPriceRequired'),
      fuelPriceInvalid: t('vehicles.form.errors.fuelPriceInvalid'),
      submitFailed: t('vehicles.form.errors.submitFailed'),
      inactivateFailed: t('vehicles.form.errors.inactivateFailed'),
    },
  };

  async function handleConfirmInactivate() {
    const success = await form.inactivate();
    if (success) {
      setConfirmInactivateVisible(false);
      setSheetVisible(false);
    }
  }

  return (
    <SlideInModal visible={visible} onRequestClose={onClose}>
      <View
        className="flex-1"
        style={{
          paddingTop: Math.max(insets.top, MIN_SCREEN_TOP),
          paddingBottom: Math.max(insets.bottom, MIN_SCREEN_BOTTOM),
        }}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          style={StyleSheet.absoluteFill}
        />

        {/* Cabeçalho */}
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <BackButton label={t('vehicles.back')} onPress={onClose} />

          <Text
            accessibilityRole="header"
            className="flex-1 pr-9 text-center text-sm font-bold tracking-wider text-label-primary"
          >
            {counterText}
          </Text>
        </View>

        {/* Conteúdo / Lista */}
        {vehicleList.length === 0 && vehiclesHook.isLoading ? (
          <View className="flex-1 items-center justify-center px-4">
            <ActivityIndicator accessibilityLabel={t('common.loading')} />
          </View>
        ) : vehicleList.length === 0 && vehiclesHook.error ? (
          <View className="flex-1 items-center justify-center gap-3 px-4">
            <Text className="text-center text-sm text-label-tertiary">
              {t('vehicles.loadFailed')}
            </Text>
            <Button
              variant="outline"
              shape="pill"
              onPress={() => {
                vehiclesHook.refetch().catch(() => undefined);
              }}
              accessibilityRole="button"
            >
              <Text>{t('common.retry')}</Text>
            </Button>
          </View>
        ) : vehicleList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <EmptyState
              icon={Car}
              title={t('vehicles.empty')}
              message={t('vehicles.emptySubtitle')}
              titleClassName="text-base leading-6 text-label-quartenery"
              messageClassName="text-[13px] leading-[19.5px]"
              action={{
                label: t('vehicles.addVehicle'),
                icon: Plus,
                onPress: handleOpenAdd,
              }}
              className="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]"
            />
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
                deactivatedLabel={t('vehicles.form.deactivated')}
                onPress={() => handleOpenView(vehicle)}
              />
            ))}
          </ScrollView>
        )}

        {/* Botão Fixo Inferior (vazio: o botão fica dentro do estado vazio) */}
        {showsEmptyAction ? null : (
          <View
            className="absolute bottom-0 left-0 right-0 px-4 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Button
              shape="pill"
              size="lg"
              className="h-[49px] w-full flex-row items-center justify-center gap-2 bg-button-primary active:opacity-90"
              onPress={handleOpenAdd}
              accessibilityRole="button"
              accessibilityLabel={t('vehicles.addVehicle')}
            >
              <Icon as={Plus} size={18} className="text-white" />
              <Text className="text-base font-semibold text-white">
                {t('vehicles.addVehicle')}
              </Text>
            </Button>
          </View>
        )}

        {/* Bottom Sheet de Formulário (Cadastro / Visualizar / Edição) */}
        <VehicleFormSheet
          visible={sheetVisible && !confirmInactivateVisible}
          mode={sheetMode}
          values={form.values}
          errors={form.errors}
          submitting={form.submitting}
          submitError={form.submitError}
          costPerKmEstimate={form.costPerKmEstimate}
          texts={formTexts}
          onChangeField={form.setFieldValue}
          onStartEdit={handleStartEdit}
          onSubmit={form.submit}
          onInactivate={() => setConfirmInactivateVisible(true)}
          onClose={() => setSheetVisible(false)}
        />

        {/* Diálogo de confirmação de inativação */}
        <ConfirmSheet
          visible={confirmInactivateVisible}
          title={t('vehicles.form.confirmInactivateTitle')}
          message={
            form.submitError === 'inactivateFailed'
              ? t('vehicles.form.errors.inactivateFailed')
              : t('vehicles.form.confirmInactivateMessage')
          }
          confirmLabel={t('vehicles.form.confirmInactivateButton')}
          cancelLabel={t('vehicles.form.cancel')}
          confirmIcon={Trash2}
          onConfirm={handleConfirmInactivate}
          onCancel={() => setConfirmInactivateVisible(false)}
        />
      </View>
    </SlideInModal>
  );
}

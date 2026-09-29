import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarPlus,
  ChevronLeft,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

import { Button } from 'app/components/ui/button';
import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import {
  AsaBadge,
  FeedbackSheet,
  formatAppointmentDateBadge,
  useExportToCalendar,
} from 'features/appointments';
import { SupplySelectorSheet, useSupplySelector } from 'features/stock';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';
import { Colors } from 'theme/colors';

import {
  AppointmentActions,
  type AppointmentActionsTexts,
} from '../components/AppointmentActions';
import { DetailStatCard } from '../components/DetailStatCard';
import { EditAmountSheet } from '../components/EditAmountSheet';
import { ProcedureFormSheet } from '../components/ProcedureFormSheet';
import { SupplyCostSummary } from '../components/SupplyCostSummary';
import { SupplyList } from '../components/SupplyList';
import { TravelSection } from '../components/TravelSection';
import { calculateHoursWorked } from '../domain/appointmentHours';
import { grossMargin } from '../domain/appointmentSupply';
import {
  formatSupplyQuantity,
  formatSupplyTotalCost,
} from '../domain/formatSupply';
import type { Species } from '../domain/procedure.types';
import {
  calculateSupplyTotalCost,
  getSupplyLineCost,
} from '../domain/supplyItem';
import {
  useAppointmentActions,
  type ActionableAppointment,
} from '../hooks/useAppointmentActions';
import {
  useAppointmentDetail,
  type AmountError,
} from '../hooks/useAppointmentDetail';
import { useProcedureForm } from '../hooks/useProcedureForm';
import { useProcedureFormTexts } from '../hooks/useProcedureFormTexts';

type AppointmentDetailScreenProps = {
  appointmentId: string | null;
  onClose: () => void;
  /** Avisa a lista do dia de que algo mudou (status, valor, insumos). */
  onChanged: () => void;
};

export function AppointmentDetailScreen({
  appointmentId,
  onClose,
  onChanged,
}: AppointmentDetailScreenProps) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const detail = useAppointmentDetail(appointmentId);
  const { appointment } = detail;
  const selector = useSupplySelector();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [amountSheetVisible, setAmountSheetVisible] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState<AmountError | null>(null);
  const [savingAmount, setSavingAmount] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const form = useProcedureForm(
    () => {
      setEditVisible(false);
      detail.refetch();
      onChanged();
    },
    editVisible,
    appointment,
  );
  const formTexts = useProcedureFormTexts(
    form.errors,
    t('procedures.detail.editTitle'),
  );

  // Modal's own `animationType="slide"` only slides vertically; this is a
  // push-style detail view, so it animates in from the right by hand.
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: appointmentId !== null ? 0 : SCREEN_WIDTH,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appointmentId, translateX]);

  const speciesLabels: Record<Species, string> = useMemo(
    () => ({
      CANINE: t('procedures.species.canine'),
      FELINE: t('procedures.species.feline'),
      EQUINE: t('procedures.species.equine'),
      BOVINE: t('procedures.species.bovine'),
      AVIAN: t('procedures.species.avian'),
      EXOTIC: t('procedures.species.exotic'),
      OTHER: t('procedures.species.other'),
    }),
    [t],
  );

  const editable = appointment !== null && appointment.status !== 'CANCELED';
  const totalCost = calculateSupplyTotalCost(detail.supplies);
  const margin = appointment
    ? grossMargin(appointment.amount, totalCost)
    : null;
  const hoursWorked =
    appointment && appointment.endsAt
      ? calculateHoursWorked(
          appointment.startsAt,
          appointment.endsAt,
          appointment.amount,
        )
      : null;

  function closeSelector(): void {
    setSelectorVisible(false);
    selector.reset();
  }

  async function confirmSupply(): Promise<void> {
    const selection = selector.submit();
    if (!selection) {
      return;
    }
    const saved = await detail.addSupply(selection.itemId, selection.quantity);
    // Em caso de falha, o aviso aparece na tela, abaixo da lista.
    closeSelector();
    if (saved) {
      onChanged();
    }
  }

  async function removeSupply(movementId: string): Promise<void> {
    await detail.removeSupply(movementId);
    onChanged();
  }

  function openAmountSheet(): void {
    const current = appointment?.amount ?? '';
    setAmountText(locale === 'pt-BR' ? current.replace('.', ',') : current);
    setAmountError(null);
    setAmountSheetVisible(true);
  }

  async function saveAmount(): Promise<void> {
    setSavingAmount(true);
    const error = await detail.saveAmount(amountText);
    setSavingAmount(false);
    setAmountError(error);
    if (error === null) {
      setAmountSheetVisible(false);
      onChanged();
    }
  }

  async function confirmDelete(): Promise<void> {
    if (await detail.remove()) {
      setDeleteVisible(false);
      onChanged();
      onClose();
    } else {
      setDeleteFailed(true);
    }
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Modal
      visible={appointmentId !== null}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <View className="flex-1" style={{ paddingTop: insets.top + 12 }}>
          <LinearGradient
            colors={Colors.background.primary.colors}
            locations={Colors.background.primary.locations}
            style={StyleSheet.absoluteFill}
          />

          <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
            <Button
              shape="pill"
              size="icon"
              icon={ChevronLeft}
              accessibilityRole="button"
              accessibilityLabel={t('procedures.detail.back')}
              onPress={onClose}
            />
            {appointment !== null ? (
              <View className="flex-row gap-2">
                {editable ? (
                  <Button
                    shape="pill"
                    size="icon"
                    icon={Pencil}
                    accessibilityRole="button"
                    accessibilityLabel={t('procedures.detail.edit')}
                    onPress={() => setEditVisible(true)}
                  />
                ) : null}
                <Button
                  shape="pill"
                  size="icon"
                  icon={Trash2}
                  accessibilityRole="button"
                  accessibilityLabel={t('procedures.detail.delete')}
                  onPress={() => {
                    setDeleteFailed(false);
                    setDeleteVisible(true);
                  }}
                />
              </View>
            ) : null}
          </View>

          {detail.status === 'error' ? (
            <View className="flex-1 items-center justify-center gap-4 px-8">
              <Text className="text-center text-sm text-label-tertiary">
                {t('procedures.detail.loadError')}
              </Text>
              <Button shape="pill" onPress={detail.refetch}>
                <Text className="font-semibold">
                  {t('procedures.detail.retry')}
                </Text>
              </Button>
            </View>
          ) : appointment === null ? null : (
            <ScrollView
              contentContainerClassName="gap-4 px-5 pb-10 pt-1"
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-[22px] font-bold text-label-primary">
                    {appointment.patientName ?? t('procedures.day.untitled')}
                  </Text>
                  {appointment.species ? (
                    <Text className="text-sm text-label-primary">
                      {speciesLabels[appointment.species]}
                    </Text>
                  ) : null}
                  {appointment.asa ? <AsaBadge asa={appointment.asa} /> : null}
                  {appointment.status !== 'SCHEDULED' ? (
                    <View
                      className={cn(
                        'rounded-md px-2 py-0.5',
                        appointment.status === 'COMPLETED'
                          ? 'bg-details-finish'
                          : 'bg-background-shade',
                      )}
                    >
                      <Text className="text-[11px] font-bold text-label-primary">
                        {appointment.status === 'COMPLETED'
                          ? t('procedures.detail.completedBadge')
                          : t('procedures.status.CANCELED')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-[15px] font-semibold text-label-primary">
                  {appointment.procedureName ?? ''}
                </Text>

                <View className="flex-row items-center gap-2 pt-0.5">
                  <View className="flex-row items-center gap-1">
                    <Icon
                      as={MapPin}
                      className="size-[11px] text-label-primary"
                    />
                    <Text className="text-xs text-label-primary">
                      {appointment.location ??
                        t('procedures.detail.notInformed')}
                    </Text>
                  </View>
                  <Text className="text-xs text-label-primary">
                    {formatAppointmentDateBadge(appointment.startsAt, locale)}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <DetailStatCard
                  label={t('procedures.fields.patientAgeYears')}
                  value={
                    appointment.patientAgeYears !== null
                      ? t('procedures.detail.ageValue', {
                          years: appointment.patientAgeYears,
                        })
                      : t('procedures.detail.notInformed')
                  }
                />
                <DetailStatCard
                  label={t('procedures.detail.weightLabel')}
                  value={
                    appointment.weightKg !== null
                      ? t('procedures.detail.weightValue', {
                          kg: appointment.weightKg,
                        })
                      : t('procedures.detail.notInformed')
                  }
                />
              </View>

              <View className="flex-row gap-2">
                <DetailStatCard
                  label={t('procedures.fields.amount')}
                  value={
                    appointment.amount === null
                      ? t('procedures.detail.noAmount')
                      : formatCurrency(
                          Number.parseFloat(appointment.amount),
                          locale,
                        )
                  }
                />
                <DetailStatCard
                  label={t('procedures.detail.time')}
                  value={
                    appointment.endsAt
                      ? `${time(appointment.startsAt)} – ${time(
                          appointment.endsAt,
                        )}`
                      : time(appointment.startsAt)
                  }
                />
              </View>

              {hoursWorked ? (
                <View className="gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/10">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-label-primary">
                      {t('procedures.detail.hoursWorked.title')}
                    </Text>
                    {editable ? (
                      <Pressable
                        onPress={openAmountSheet}
                        accessibilityRole="button"
                        accessibilityLabel={t(
                          'procedures.detail.hoursWorked.edit',
                        )}
                        hitSlop={8}
                      >
                        <Text className="text-xs font-semibold text-label-quartenery">
                          {t('procedures.detail.hoursWorked.edit')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View className="flex-row items-end justify-between">
                    <View className="gap-0.5">
                      <Text className="text-2xl font-bold text-label-primary">
                        {`${hoursWorked.hours.toLocaleString(locale, {
                          maximumFractionDigits: 1,
                        })}h`}
                      </Text>
                      <Text className="text-xs text-label-primary">
                        {t('procedures.detail.hoursWorked.minutesLabel', {
                          count: Math.round(hoursWorked.minutes),
                        })}
                      </Text>
                    </View>
                    <View className="items-end gap-0.5">
                      <Text className="text-right text-[11px] font-semibold uppercase tracking-wide text-label-primary">
                        {t('procedures.detail.hoursWorked.valuePerHour')}
                      </Text>
                      <Text className="text-lg font-bold text-label-primary">
                        {hoursWorked.valuePerHour === null
                          ? t('procedures.detail.noAmount')
                          : formatCurrency(hoursWorked.valuePerHour, locale)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-label-primary">
                    {t('procedures.detail.suppliesTitle')}
                  </Text>
                  {editable ? (
                    <Pressable
                      onPress={() => setSelectorVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('procedures.detail.addSupply')}
                      disabled={detail.savingSupply}
                      hitSlop={8}
                      className="flex-row items-center gap-1 rounded-full bg-details-primary px-3 py-2"
                    >
                      <Icon
                        as={Plus}
                        size={14}
                        className="text-label-primary"
                      />
                      <Text className="text-xs font-semibold text-label-primary">
                        {t('procedures.detail.addSupplyShort')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <SupplyList
                  rows={detail.supplies.map(item => ({
                    id: item.id,
                    name: item.name,
                    detail: t('procedures.supplies.lineDetail', {
                      quantity: formatSupplyQuantity(item.quantity, locale),
                      unitCost: formatCurrency(item.unitCost, locale),
                    }),
                    cost: formatCurrency(getSupplyLineCost(item), locale),
                    removeLabel: t('procedures.supplies.remove', {
                      name: item.name,
                    }),
                  }))}
                  emptyMessage={t('procedures.supplies.empty')}
                  onRemove={editable ? removeSupply : undefined}
                />
                {detail.supplyFailed ? (
                  <Text className="text-xs text-alert-primary">
                    {t('procedures.detail.suppliesFailed')}
                  </Text>
                ) : null}

                <TravelSection
                  editable={editable}
                  texts={{
                    title: t('procedures.detail.travel.title'),
                    emptyMessage: t('procedures.detail.travel.empty'),
                    register: t('procedures.detail.travel.register'),
                    collapse: t('procedures.detail.travel.collapse'),
                    vehicleLabel: t('procedures.detail.travel.vehicleLabel'),
                    vehiclePlaceholder: t(
                      'procedures.detail.travel.vehiclePlaceholder',
                    ),
                    distanceLabel: t('procedures.detail.travel.distanceLabel'),
                    distancePlaceholder: t(
                      'procedures.detail.travel.distancePlaceholder',
                    ),
                    confirm: t('procedures.detail.travel.confirm'),
                  }}
                />

                <SupplyCostSummary
                  totalLabel={t('procedures.supplies.totalCost')}
                  totalValue={formatSupplyTotalCost(totalCost, locale)}
                  isDeduction={totalCost > 0}
                  grossMargin={
                    margin === null
                      ? undefined
                      : {
                          label: t('procedures.supplies.grossMargin'),
                          value: formatCurrency(margin, locale),
                        }
                  }
                />
              </View>

              {/* A key no valor remonta as ações quando ele é preenchido: o aviso
                de "preencha o valor" não pode continuar na tela. */}
              <ActionsSection
                key={appointment.amount ?? 'no-amount'}
                appointment={appointment}
                onChanged={() => {
                  detail.refetch();
                  onChanged();
                }}
              />

              {/* Only upcoming work goes to the calendar, and the web has no
                native calendar to write to. */}
              {appointment.status === 'SCHEDULED' && Platform.OS !== 'web' ? (
                <ExportSection appointment={appointment} />
              ) : null}
            </ScrollView>
          )}
        </View>
      </Animated.View>

      <ProcedureFormSheet
        visible={editVisible}
        values={form.values}
        submitting={form.submitting}
        submitFailed={form.submitFailed}
        submitErrorText={t('procedures.form.submitError')}
        texts={formTexts}
        client={form.client}
        onChangeText={form.setTextField}
        onChangeClientTerm={form.client.onTermChange}
        onSelectClient={form.client.onSelect}
        onChangeSpecies={value => form.setField('species', value)}
        onChangeAsa={value => form.setField('asaClassification', value)}
        onSubmit={form.submit}
        onClose={() => setEditVisible(false)}
      />

      <ConfirmSheet
        visible={deleteVisible}
        title={t('procedures.detail.deleteConfirm')}
        message={deleteFailed ? t('procedures.detail.deleteFailed') : undefined}
        confirmLabel={t('procedures.detail.delete')}
        cancelLabel={t('procedures.detail.deleteCancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteVisible(false)}
      />

      <EditAmountSheet
        visible={amountSheetVisible}
        value={amountText}
        errorText={
          amountError
            ? t(`procedures.detail.amountSheet.errors.${amountError}`)
            : null
        }
        submitting={savingAmount}
        texts={{
          title: t('procedures.detail.amountSheet.title'),
          placeholder: t('procedures.detail.amountSheet.placeholder'),
          confirm: t('procedures.detail.amountSheet.confirm'),
        }}
        onChangeValue={value => {
          setAmountText(value);
          setAmountError(null);
        }}
        onConfirm={saveAmount}
        onClose={() => setAmountSheetVisible(false)}
      />

      <SupplySelectorSheet
        visible={selectorVisible}
        onClose={closeSelector}
        onConfirm={confirmSupply}
        term={selector.term}
        onTermChange={selector.onTermChange}
        options={selector.options}
        isLoading={selector.isLoading}
        hasError={selector.hasError}
        isTermTooShort={selector.isTermTooShort}
        selected={selector.selected}
        onSelect={selector.onSelect}
        quantity={selector.quantity}
        onQuantityChange={selector.onQuantityChange}
        isOverBalance={selector.isOverBalance}
        canSubmit={selector.canSubmit && !detail.savingSupply}
        title={t('stock.supplySelector.title')}
        materialLabel={t('stock.supplySelector.materialLabel')}
        searchPlaceholder={t('stock.supplySelector.searchPlaceholder')}
        quantityLabel={t('stock.supplySelector.quantityLabel')}
        confirmLabel={t('stock.supplySelector.confirm')}
        closeLabel={t('stock.supplySelector.close')}
        emptyMessage={t('stock.supplySelector.empty')}
        errorMessage={t('stock.supplySelector.error')}
        loadingMessage={t('stock.supplySelector.loading')}
        termTooShortMessage={t('stock.supplySelector.termTooShort')}
        insufficientStockMessage={t('stock.supplySelector.insufficientStock')}
        formatPrice={option => formatCurrency(option.price, locale)}
      />
    </Modal>
  );
}

function ExportSection({
  appointment,
}: {
  appointment: Parameters<typeof useExportToCalendar>[0];
}) {
  const { t } = useTranslation();
  const exportState = useExportToCalendar(appointment);
  const feedback = {
    success: {
      title: t('appointments.exportSuccessTitle'),
      message: t('appointments.exportSuccess'),
    },
    permissionDenied: {
      title: t('appointments.exportPermissionDeniedTitle'),
      message: t('appointments.exportPermissionDenied'),
    },
    error: {
      title: t('appointments.exportErrorTitle'),
      message: t('appointments.exportError'),
    },
  } as const;

  return (
    <>
      <Button
        shape="pill"
        variant="outline"
        icon={CalendarPlus}
        disabled={exportState.status === 'exporting'}
        accessibilityLabel={t('appointments.exportToCalendar')}
        onPress={exportState.exportToCalendar}
      >
        <Text className="font-semibold">
          {t('appointments.exportToCalendar')}
        </Text>
      </Button>
      {(['success', 'permissionDenied', 'error'] as const).map(status => (
        <FeedbackSheet
          key={status}
          visible={exportState.status === status}
          title={feedback[status].title}
          message={feedback[status].message}
          dismissLabel={t('appointments.dismiss')}
          onDismiss={exportState.reset}
        />
      ))}
    </>
  );
}

function ActionsSection({
  appointment,
  onChanged,
}: {
  appointment: ActionableAppointment;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const actions = useAppointmentActions(appointment, onChanged);

  return (
    <AppointmentActions
      visible={actions.visible}
      submitting={actions.submitting}
      notice={actions.notice}
      justCanceled={actions.justCanceled}
      onComplete={actions.complete}
      cancellation={actions.cancellation}
      texts={actionTexts(t)}
    />
  );
}

function actionTexts(
  t: ReturnType<typeof useTranslation>['t'],
): AppointmentActionsTexts {
  return {
    complete: t('procedures.completion.action'),
    cancel: t('appointments.notDone.action'),
    toast: t('appointments.notDone.toast'),
    notices: {
      CANCELED: t('procedures.completion.notices.CANCELED'),
      COMPLETED: t('procedures.completion.notices.COMPLETED'),
      AMOUNT_REQUIRED: t('procedures.completion.notices.AMOUNT_REQUIRED'),
      FAILED: t('procedures.completion.notices.FAILED'),
      CANCEL_FAILED: t('procedures.completion.notices.CANCEL_FAILED'),
    },
    cancellation: {
      title: t('procedures.cancellation.title'),
      reason: t('appointments.notDone.reason'),
      reasons: {
        noShow: t('appointments.notDone.reasons.noShow'),
        clientCanceled: t('appointments.notDone.reasons.clientCanceled'),
        emergency: t('appointments.notDone.reasons.emergency'),
        other: t('appointments.notDone.reasons.other'),
      },
      reasonPlaceholder: t('procedures.cancellation.reasonPlaceholder'),
      confirm: t('procedures.cancellation.confirm'),
      dismiss: t('appointments.notDone.dismiss'),
      errors: {
        REQUIRED: t('procedures.cancellation.errors.REQUIRED'),
        TOO_LONG: t('procedures.cancellation.errors.TOO_LONG'),
        FAILED: t('procedures.cancellation.errors.FAILED'),
      },
    },
  };
}

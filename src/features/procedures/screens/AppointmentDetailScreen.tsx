import { ChevronLeft, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { SupplySelectorSheet, useSupplySelector } from 'features/stock';
import { useTranslation, type TranslationKey } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import {
  AppointmentActions,
  type AppointmentActionsTexts,
} from '../components/AppointmentActions';
import { EditAmountSheet } from '../components/EditAmountSheet';
import { SupplyCostSummary } from '../components/SupplyCostSummary';
import { SupplyList } from '../components/SupplyList';
import { grossMargin } from '../domain/appointmentSupply';
import {
  formatSupplyQuantity,
  formatSupplyTotalCost,
} from '../domain/formatSupply';
import type { AppointmentStatus } from '../domain/procedure.types';
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

type AppointmentDetailScreenProps = {
  appointmentId: string | null;
  onClose: () => void;
  /** Avisa a lista do dia de que algo mudou (status, valor, insumos). */
  onChanged: () => void;
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-details-primary text-label-primary',
  COMPLETED: 'bg-button-primary text-white',
  CANCELED: 'bg-background-shade text-label-tertiary',
};

export function AppointmentDetailScreen({
  appointmentId,
  onClose,
  onChanged,
}: AppointmentDetailScreenProps) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const detail = useAppointmentDetail(appointmentId);
  const { appointment } = detail;
  const selector = useSupplySelector();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [amountSheetVisible, setAmountSheetVisible] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState<AmountError | null>(null);
  const [savingAmount, setSavingAmount] = useState(false);

  const editable = appointment !== null && appointment.status !== 'CANCELED';
  const totalCost = calculateSupplyTotalCost(detail.supplies);
  const margin = appointment
    ? grossMargin(appointment.amount, totalCost)
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

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Modal
      visible={appointmentId !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-background-modal"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-1 px-3 pb-2">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('procedures.detail.back')}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon as={ChevronLeft} className="size-7 text-label-quartenery" />
          </Pressable>
          <Text className="text-xl font-bold text-label-primary">
            {t('procedures.detail.title')}
          </Text>
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
            contentContainerClassName="gap-6 px-5 pb-10 pt-2"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-3 rounded-2xl bg-white p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-lg font-bold text-label-primary">
                    {appointment.patientName ?? t('procedures.day.untitled')}
                  </Text>
                  <Text className="text-sm text-label-primary">
                    {appointment.procedureName ?? ''}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'overflow-hidden rounded-full px-3 py-1 text-xs font-semibold',
                    STATUS_BADGE[appointment.status],
                  )}
                >
                  {t(
                    `procedures.status.${appointment.status}` as TranslationKey,
                  )}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-sm text-label-tertiary">
                  {t('procedures.detail.time')}
                </Text>
                <Text className="text-sm text-label-primary">
                  {appointment.endsAt
                    ? `${time(appointment.startsAt)} – ${time(
                        appointment.endsAt,
                      )}`
                    : time(appointment.startsAt)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-label-tertiary">
                  {t('procedures.detail.amount')}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-label-primary">
                    {appointment.amount === null
                      ? t('procedures.detail.noAmount')
                      : formatCurrency(
                          Number.parseFloat(appointment.amount),
                          locale,
                        )}
                  </Text>
                  {editable ? (
                    <Pressable
                      onPress={openAmountSheet}
                      accessibilityRole="button"
                      accessibilityLabel={t('procedures.detail.editAmount')}
                      hitSlop={10}
                      className="p-1"
                    >
                      <Icon
                        as={Pencil}
                        size={16}
                        className="text-label-primary"
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

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
                    <Icon as={Plus} size={14} className="text-label-primary" />
                    <Text className="text-xs font-semibold text-label-primary">
                      {t('procedures.detail.addSupply')}
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
          </ScrollView>
        )}
      </View>

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
    cancel: t('procedures.cancellation.action'),
    notices: {
      CANCELED: t('procedures.completion.notices.CANCELED'),
      COMPLETED: t('procedures.completion.notices.COMPLETED'),
      AMOUNT_REQUIRED: t('procedures.completion.notices.AMOUNT_REQUIRED'),
      FAILED: t('procedures.completion.notices.FAILED'),
      CANCEL_FAILED: t('procedures.completion.notices.CANCEL_FAILED'),
    },
    cancellation: {
      title: t('procedures.cancellation.title'),
      reasonPlaceholder: t('procedures.cancellation.reasonPlaceholder'),
      confirm: t('procedures.cancellation.confirm'),
      errors: {
        REQUIRED: t('procedures.cancellation.errors.REQUIRED'),
        TOO_LONG: t('procedures.cancellation.errors.TOO_LONG'),
        FAILED: t('procedures.cancellation.errors.FAILED'),
      },
    },
  };
}

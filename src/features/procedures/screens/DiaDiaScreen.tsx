import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import {
  NewClientSheet,
  useNewClientForm,
  type ClientType,
} from 'features/clients';
import { useTranslation } from 'shared/i18n';
import {
  formatCalendarDate,
  isRangeComplete,
  type CalendarRange,
} from 'shared/utils/calendar';

import {
  ProcedureFormSheet,
  type ProcedureFormTexts,
} from '../components/ProcedureFormSheet';
import {
  ProcedureHistoryList,
  type ProcedureHistoryListItem,
} from '../components/ProcedureHistoryList';
import { ProcedurePeriodFilter } from '../components/ProcedurePeriodFilter';
import {
  formatAppointmentAmount,
  formatShortDate,
  toAsaBadgeValue,
} from '../domain/formatProcedure';
import {
  ASA_CLASSIFICATIONS,
  type FieldErrorCode,
  type ProcedureFormValues,
  type ProcedureHistoryItem,
  type Species,
} from '../domain/procedure.types';
import { useDiaDia } from '../hooks/useDiaDia';
import { useProcedureForm } from '../hooks/useProcedureForm';

const SPECIES_LABEL_KEYS = {
  CANINE: 'procedures.species.canine',
  FELINE: 'procedures.species.feline',
  OTHER: 'procedures.species.other',
} as const satisfies Record<Species, string>;

export function DiaDiaScreen() {
  const { t, locale } = useTranslation();
  const diaDia = useDiaDia();
  const [formVisible, setFormVisible] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const {
    values,
    errors,
    submitting,
    submitFailed,
    timeConflict,
    isEditing,
    client,
    setField,
    setTextField,
    submit,
    begin,
    dismissTimeConflict,
  } = useProcedureForm(() => {
    setFormVisible(false);
    diaDia.refresh();
  }, formVisible);
  const newClient = useNewClientForm();
  const [newClientVisible, setNewClientVisible] = useState(false);

  function openCreateForm(): void {
    begin(null);
    setFormVisible(true);
  }

  function openEditForm(id: string): void {
    const item = diaDia.items.find(
      candidate => candidate.appointment.id === id,
    );
    if (item) {
      begin(item);
      setFormVisible(true);
    }
  }

  function closeNewClient(): void {
    setNewClientVisible(false);
    newClient.reset();
  }

  async function registerNewClient(): Promise<void> {
    const created = await newClient.submit();
    if (created) {
      client.onCreated(created);
      closeNewClient();
    }
  }

  const errorText = (code?: FieldErrorCode): string | undefined =>
    code ? t(`procedures.errors.${code}`) : undefined;

  const resolvedErrors = Object.fromEntries(
    Object.entries(errors).map(([field, code]) => [field, errorText(code)]),
  ) as ProcedureFormTexts['errors'];

  const labels: Record<keyof ProcedureFormValues, string> = {
    patientName: t('procedures.fields.patientName'),
    procedureName: t('procedures.fields.procedureName'),
    clientId: t('procedures.form.location'),
    patientAgeYears: t('procedures.fields.patientAgeYears'),
    weightKg: t('procedures.fields.weightKg'),
    startTime: t('procedures.fields.startTime'),
    endTime: t('procedures.fields.endTime'),
    date: t('procedures.fields.date'),
    notes: t('procedures.fields.notes'),
    amount: t('procedures.fields.amount'),
    species: t('procedures.fields.species'),
    asaClassification: t('procedures.fields.asaClassification'),
  };

  const texts: ProcedureFormTexts = {
    title: t(isEditing ? 'procedures.form.editTitle' : 'procedures.form.title'),
    confirm: t('procedures.form.confirm'),
    labels,
    placeholders: {
      patientName: t('procedures.placeholders.patientName'),
      procedureName: t('procedures.placeholders.procedureName'),
      clientId: t('procedures.placeholders.location'),
      patientAgeYears: t('procedures.placeholders.number'),
      weightKg: t('procedures.placeholders.number'),
      startTime: t('procedures.placeholders.time'),
      endTime: t('procedures.placeholders.time'),
      date: t('procedures.placeholders.date'),
      amount: t('procedures.placeholders.number'),
    },
    speciesOptions: [
      { value: 'CANINE', label: t('procedures.species.canine') },
      { value: 'FELINE', label: t('procedures.species.feline') },
    ],
    asaOptions: [...ASA_CLASSIFICATIONS],
    errors: resolvedErrors,
    clientSearchMessages: {
      loading: t('procedures.clientSearch.loading'),
      error: t('procedures.clientSearch.error'),
      empty: t('procedures.clientSearch.empty'),
    },
    newClient: t('procedures.form.newClient'),
  };

  const clientTypeTexts: Record<ClientType, string> = {
    CLINIC: t('clients.newClient.types.clinic'),
    INDIVIDUAL: t('clients.newClient.types.individual'),
  };

  const periodLabel = (range: CalendarRange): string => {
    if (range.from === null) {
      return t('procedures.list.filters.period');
    }

    const from = formatCalendarDate(range.from, locale);

    if (range.to === null) {
      return t('procedures.list.filters.periodFrom', { from });
    }
    if (range.to === range.from) {
      return t('procedures.list.filters.periodSingle', { day: from });
    }

    return t('procedures.list.filters.periodRange', {
      from,
      to: formatCalendarDate(range.to, locale),
    });
  };

  const listItems: ProcedureHistoryListItem[] = diaDia.items.map(
    ({ appointment, clientName }: ProcedureHistoryItem) => {
      const speciesKey = appointment.species
        ? SPECIES_LABEL_KEYS[appointment.species]
        : undefined;
      const asa = toAsaBadgeValue(appointment.asa);

      return {
        id: appointment.id,
        patientName: appointment.patientName ?? '',
        speciesLabel: speciesKey ? t(speciesKey) : undefined,
        asaLabel: asa
          ? t('procedures.list.asaBadge', { value: asa })
          : undefined,
        procedureName: appointment.procedureName ?? '',
        clientName: clientName ?? t('procedures.list.clientNotInformed'),
        date: formatShortDate(appointment.startsAt, locale),
        amount: formatAppointmentAmount(appointment.amount, locale),
      };
    },
  );

  const filter = (
    <View className="gap-4">
      <Text variant="h4">{t('procedures.list.title')}</Text>
      <ProcedurePeriodFilter
        range={diaDia.range}
        onRangeChange={range => {
          diaDia.setRange(range);

          if (isRangeComplete(range)) {
            setIsCalendarOpen(false);
          }
        }}
        isCalendarOpen={isCalendarOpen}
        onToggleCalendar={() => setIsCalendarOpen(open => !open)}
        onClear={() => {
          diaDia.clearRange();
          setIsCalendarOpen(false);
        }}
        canClear={diaDia.isFiltering}
        locale={locale}
        periodLabel={periodLabel(diaDia.range)}
        clearLabel={t('procedures.list.filters.clear')}
        previousMonthLabel={t('procedures.list.filters.previousMonth')}
        nextMonthLabel={t('procedures.list.filters.nextMonth')}
      />
    </View>
  );

  return (
    <View className="flex-1">
      <ProcedureHistoryList
        items={listItems}
        header={filter}
        isLoading={diaDia.isLoading}
        isLoadingMore={diaDia.isLoadingMore}
        loadingMoreLabel={t('procedures.list.loadingMore')}
        emptyMessage={t(
          diaDia.isFiltering
            ? 'procedures.list.emptyFiltered'
            : 'procedures.list.empty',
        )}
        error={
          diaDia.hasError
            ? {
                message: t('procedures.list.error'),
                retryLabel: t('common.retry'),
                onRetry: diaDia.retry,
              }
            : undefined
        }
        onPressItem={openEditForm}
        onEndReached={diaDia.loadMore}
      />
      <Pressable
        onPress={openCreateForm}
        accessibilityRole="button"
        accessibilityLabel={t('procedures.newProcedure')}
        hitSlop={8}
        className="absolute bottom-6 right-4 h-14 w-14 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={Plus} className="size-7 text-label-secondary" />
      </Pressable>
      <ProcedureFormSheet
        visible={formVisible}
        values={values}
        submitting={submitting}
        submitFailed={submitFailed}
        submitErrorText={t('procedures.form.submitError')}
        texts={texts}
        client={client}
        onChangeText={setTextField}
        onChangeClientTerm={client.onTermChange}
        onSelectClient={client.onSelect}
        onPressNewClient={() => setNewClientVisible(true)}
        onChangeSpecies={value => setField('species', value)}
        onChangeAsa={value => setField('asaClassification', value)}
        onSubmit={submit}
        onClose={() => setFormVisible(false)}
      />
      <NewClientSheet
        visible={newClientVisible}
        draft={newClient.draft}
        fieldErrors={{
          name: newClient.errors.name
            ? t(`clients.newClient.errors.name.${newClient.errors.name}`)
            : undefined,
        }}
        failureMessage={newClient.failure ? t(newClient.failure) : null}
        isSaving={newClient.isSaving}
        title={t('clients.newClient.title')}
        typeLabel={t('clients.newClient.type')}
        typeTexts={clientTypeTexts}
        fieldTexts={{
          name: {
            label: t('clients.newClient.fields.name.label'),
            placeholder: t('clients.newClient.fields.name.placeholder'),
          },
          phone: {
            label: t('clients.newClient.fields.phone.label'),
            placeholder: t('clients.newClient.fields.phone.placeholder'),
          },
        }}
        confirmLabel={t('clients.newClient.confirm')}
        savingLabel={t('clients.newClient.saving')}
        cancelLabel={t('clients.newClient.cancel')}
        closeLabel={t('clients.newClient.close')}
        onChangeField={newClient.setField}
        onChangeType={newClient.setType}
        onSubmit={registerNewClient}
        onClose={closeNewClient}
      />
      <ConfirmSheet
        visible={timeConflict}
        title={t('procedures.conflict.title')}
        message={t('procedures.conflict.message')}
        confirmLabel={t('procedures.conflict.changeInfo')}
        onConfirm={dismissTimeConflict}
        onCancel={dismissTimeConflict}
      />
    </View>
  );
}

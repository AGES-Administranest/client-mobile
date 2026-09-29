import { CalendarDays, MapPin, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { AsaBadge } from './AsaBadge';
import {
  formatAppointmentSchedule,
  formatCurrency,
  type Appointment,
  type AppointmentStatus,
  type Species,
} from '../domain/appointment';

export type AppointmentDayListProps = {
  date: string;
  formattedDate: string;
  appointments: Appointment[];
  sectionTitle?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  addLabel?: string;
  speciesLabels?: Record<Species, string>;
  /** Shown on completed and canceled cards; scheduled ones carry no badge. */
  statusLabels?: Partial<Record<AppointmentStatus, string>>;
  /** Replaces the default empty card. */
  emptyState?: ReactNode;
  onAddAppointment?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  /** A lista cobre mais de um dia (o mês): cada card mostra a data também. */
  showDate?: boolean;
  locale?: string;
  className?: string;
};

export function AppointmentDayList({
  appointments,
  sectionTitle = 'PROCEDIMENTOS DO MÊS OU DIA',
  emptyTitle = 'Nenhum agendamento para este dia',
  emptySubtitle = 'Toque em "+ Novo agendamento" para adicionar um procedimento.',
  addLabel = '+ Novo agendamento',
  speciesLabels = {
    CANINE: 'Canino',
    FELINE: 'Felino',
    OTHER: 'Outro',
  },
  statusLabels,
  emptyState,
  onAddAppointment,
  onSelectAppointment,
  showDate = false,
  locale,
  className,
}: AppointmentDayListProps) {
  const count = appointments.length;

  return (
    <View className={cn('gap-2.5 mt-5', className)}>
      {/* Título da Seção */}
      {sectionTitle ? (
        <Text className="text-xs font-bold uppercase tracking-wider text-label-primary px-1 mb-1">
          {sectionTitle}
        </Text>
      ) : null}

      {/* Lista de agendamentos ou Estado Vazio */}
      {count === 0 && emptyState !== undefined ? (
        emptyState
      ) : count === 0 ? (
        <View className="items-center justify-center rounded-2xl bg-white/70 border border-dashed border-border-primary/80 p-8 my-2">
          <View className="size-12 items-center justify-center rounded-full bg-details-primary/80 mb-3">
            <Icon as={CalendarDays} className="size-6 text-label-quartenery" />
          </View>
          <Text className="text-base font-bold text-label-primary text-center">
            {emptyTitle}
          </Text>
          <Text className="text-xs text-label-tertiary text-center mt-1 px-4">
            {emptySubtitle}
          </Text>
          {onAddAppointment && (
            <Button
              icon={Plus}
              onPress={onAddAppointment}
              className="mt-4 rounded-full px-5 py-2.5"
            >
              <Text className="text-sm font-semibold text-white">
                {addLabel}
              </Text>
            </Button>
          )}
        </View>
      ) : (
        <View className="gap-3">
          {appointments.map(item => {
            const speciesLabel = item.species
              ? speciesLabels[item.species] ?? item.species
              : null;
            const formattedAmount = formatCurrency(item.amount);
            const schedule = formatAppointmentSchedule(
              item.startsAt,
              item.endsAt,
              { withDate: showDate, locale },
            );

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.patientName ?? 'Paciente'}, ${
                  item.procedureName ?? 'Procedimento'
                }`}
                onPress={() => onSelectAppointment?.(item)}
                className="rounded-2xl bg-white p-4 active:opacity-85"
                style={styles.card}
              >
                {/* Linha 1: Nome do Paciente, Espécie, ASA Badge e Valor */}
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <Text className="text-[15px] font-bold text-label-primary">
                      {item.patientName ?? 'Sem nome'}
                    </Text>

                    {speciesLabel && (
                      <Text className="text-xs font-medium text-label-tertiary">
                        {speciesLabel}
                      </Text>
                    )}

                    {item.asa ? <AsaBadge asa={item.asa} /> : null}
                  </View>

                  <View className="items-end">
                    {formattedAmount ? (
                      <Text
                        className={cn(
                          'text-[15px] font-bold text-label-primary',
                          item.status === 'CANCELED' &&
                            'text-label-tertiary line-through',
                        )}
                      >
                        {formattedAmount}
                      </Text>
                    ) : null}
                    {item.status !== 'SCHEDULED' &&
                    statusLabels?.[item.status] ? (
                      <Text className="text-[10px] font-semibold uppercase text-label-tertiary">
                        {statusLabels[item.status]}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Linha 2: Nome do Procedimento */}
                {item.procedureName && (
                  <Text className="text-[13px] font-normal text-label-primary mb-2.5">
                    {item.procedureName}
                  </Text>
                )}

                {/* Linha 3: Local/Clínica e horário */}
                <View className="flex-row items-center justify-between">
                  {item.location ? (
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                      <Icon
                        as={MapPin}
                        className="size-[11px] text-label-tertiary"
                      />
                      <Text
                        numberOfLines={1}
                        className="text-xs text-label-tertiary font-normal"
                      >
                        {item.location}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-1" />
                  )}

                  <Text className="text-xs font-normal text-label-tertiary">
                    {schedule}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});

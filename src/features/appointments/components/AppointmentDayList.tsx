import { CalendarDays, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import {
  formatAppointmentDateBadge,
  formatCurrency,
  type Appointment,
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
  onAddAppointment?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
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
  onAddAppointment,
  onSelectAppointment,
  className,
}: AppointmentDayListProps) {
  const count = appointments.length;

  return (
    <View className={cn('gap-2.5 mt-5', className)}>
      {/* Título da Seção */}
      <Text className="text-xs font-bold uppercase tracking-wider text-label-primary px-1 mb-1">
        {sectionTitle}
      </Text>

      {/* Lista de agendamentos ou Estado Vazio */}
      {count === 0 ? (
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
            const dateBadge = formatAppointmentDateBadge(item.startsAt);

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.patientName ?? 'Paciente'}, ${
                  item.procedureName ?? 'Procedimento'
                }`}
                onPress={() => onSelectAppointment?.(item)}
                className="rounded-2xl bg-white p-4 shadow-sm border border-border-primary/25 active:opacity-85"
              >
                {/* Linha 1: Nome do Paciente, Espécie, ASA Badge e Valor */}
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <Text className="text-base font-bold text-label-primary">
                      {item.patientName ?? 'Sem nome'}
                    </Text>

                    {speciesLabel && (
                      <Text className="text-xs font-medium text-label-tertiary">
                        {speciesLabel}
                      </Text>
                    )}

                    {item.asaClassification && (
                      <View className="rounded-md bg-details-primary px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-label-tertiary uppercase">
                          {item.asaClassification}
                        </Text>
                      </View>
                    )}
                  </View>

                  {formattedAmount ? (
                    <Text className="text-base font-bold text-label-primary">
                      {formattedAmount}
                    </Text>
                  ) : null}
                </View>

                {/* Linha 2: Nome do Procedimento */}
                {item.procedureName && (
                  <Text className="text-sm font-medium text-label-primary mb-2.5">
                    {item.procedureName}
                  </Text>
                )}

                {/* Linha 3: Local/Clínica e Data/Hora */}
                <View className="flex-row items-center justify-between">
                  {item.location ? (
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                      <Icon
                        as={MapPin}
                        className="size-3.5 text-label-tertiary"
                      />
                      <Text
                        numberOfLines={1}
                        className="text-xs text-label-tertiary font-medium"
                      >
                        {item.location}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-1" />
                  )}

                  <Text className="text-xs font-medium text-label-tertiary">
                    {dateBadge}
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

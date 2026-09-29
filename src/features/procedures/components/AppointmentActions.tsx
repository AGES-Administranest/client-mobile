import { CalendarX2, Check, RefreshCw, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import {
  CancelAppointmentSheet,
  type CancelAppointmentSheetTexts,
} from './CancelAppointmentSheet';
import {
  RescheduleAppointmentSheet,
  type RescheduleAppointmentSheetTexts,
} from './RescheduleAppointmentSheet';
import type {
  CancellationReasonLabels,
  CancellationReasonPreset,
} from '../domain/cancellationReasonPresets';
import type { FieldErrorCode } from '../domain/procedure.types';
import type { AppointmentActionNotice } from '../domain/toCompletionOutcome';
import type { CancellationReasonError } from '../domain/validateCancellationReason';
import type { RescheduleState } from '../hooks/useRescheduleAppointment';

export type AppointmentActionsTexts = {
  open: string;
  complete: string;
  notDone: string;
  cancel: string;
  toast: string;
  notices: Record<AppointmentActionNotice, string>;
  cancellation: CancelAppointmentSheetTexts & {
    errors: Record<CancellationReasonError | 'FAILED', string>;
  };
  reschedule: RescheduleAppointmentSheetTexts & {
    done: string;
    errors: Record<'CONFLICT' | 'FAILED', string>;
    fieldErrors: Partial<Record<FieldErrorCode, string>>;
  };
};

export type AppointmentActionsReschedule = Pick<
  RescheduleState,
  | 'visible'
  | 'values'
  | 'errors'
  | 'failure'
  | 'submitting'
  | 'done'
  | 'open'
  | 'close'
  | 'setField'
  | 'confirm'
>;

export type AppointmentActionsCancellation = {
  sheetVisible: boolean;
  preset: CancellationReasonPreset | null;
  reason: string;
  reasonError: CancellationReasonError | null;
  failed: boolean;
  open: () => void;
  close: () => void;
  setPreset: (preset: CancellationReasonPreset) => void;
  setReason: (reason: string) => void;
  confirm: (labels: CancellationReasonLabels) => void;
};

type AppointmentActionsProps = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  justCanceled: boolean;
  texts: AppointmentActionsTexts;
  onComplete: () => void;
  cancellation: AppointmentActionsCancellation;
  /** Não realizado: remarca o mesmo agendamento para outra data. */
  reschedule: AppointmentActionsReschedule;
  className?: string;
};

const TERMINAL_NOTICES: readonly AppointmentActionNotice[] = [
  'CANCELED',
  'COMPLETED',
];

export function AppointmentActions({
  visible,
  submitting,
  notice,
  justCanceled,
  texts,
  onComplete,
  cancellation,
  reschedule,
  className,
}: AppointmentActionsProps) {
  const [optionsVisible, setOptionsVisible] = useState(false);

  if (!visible && !justCanceled) {
    return null;
  }

  if (justCanceled) {
    return (
      <View className={cn('gap-3', className)}>
        <View className="rounded-2xl bg-details-primary p-4">
          <Text className="text-sm text-label-primary">{texts.toast}</Text>
        </View>
      </View>
    );
  }

  if (notice && TERMINAL_NOTICES.includes(notice)) {
    return (
      <View className={className}>
        <Text className="text-sm text-label-primary">
          {texts.notices[notice]}
        </Text>
      </View>
    );
  }

  if (!visible) {
    return null;
  }

  const sheetError = cancellation.reasonError
    ? texts.cancellation.errors[cancellation.reasonError]
    : cancellation.failed
    ? texts.cancellation.errors.FAILED
    : null;

  const reasonLabels: CancellationReasonLabels = {
    noShow: texts.cancellation.reasons.noShow,
    clientCanceled: texts.cancellation.reasons.clientCanceled,
    emergency: texts.cancellation.reasons.emergency,
  };

  // As três saídas de um agendamento ficam numa folha só (Finalizar, Não
  // realizado, Cancelar); fechar a folha antes de agir evita duas por cima.
  const busy = submitting || reschedule.submitting;
  const fieldErrors = Object.fromEntries(
    Object.entries(reschedule.errors).map(([field, code]) => [
      field,
      code ? texts.reschedule.fieldErrors[code] : undefined,
    ]),
  );

  const choose = (action: () => void) => {
    setOptionsVisible(false);
    action();
  };

  return (
    <View className={cn('gap-3', className)}>
      <Button
        shape="pill"
        icon={RefreshCw}
        className="h-[49px] w-full"
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={texts.open}
        accessibilityState={{ disabled: busy, busy }}
        onPress={() => setOptionsVisible(true)}
      >
        <Text className="font-semibold">{texts.open}</Text>
      </Button>
      {reschedule.done && !notice ? (
        <Text className="text-sm text-label-primary">
          {texts.reschedule.done}
        </Text>
      ) : null}
      {notice ? (
        <Text className="text-sm text-alert-primary">
          {texts.notices[notice]}
        </Text>
      ) : null}

      <CancelAppointmentSheet
        visible={cancellation.sheetVisible}
        preset={cancellation.preset}
        reason={cancellation.reason}
        errorText={sheetError}
        submitting={submitting}
        texts={texts.cancellation}
        onSelectPreset={cancellation.setPreset}
        onChangeReason={cancellation.setReason}
        onConfirm={() => cancellation.confirm(reasonLabels)}
        onClose={cancellation.close}
      />

      <RescheduleAppointmentSheet
        visible={reschedule.visible}
        values={reschedule.values}
        fieldErrors={fieldErrors}
        errorText={
          reschedule.failure
            ? texts.reschedule.errors[reschedule.failure]
            : null
        }
        submitting={reschedule.submitting}
        texts={texts.reschedule}
        onChangeField={reschedule.setField}
        onConfirm={reschedule.confirm}
        onClose={reschedule.close}
      />

      <OptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        options={[
          {
            label: texts.complete,
            icon: Check,
            onPress: () => choose(onComplete),
          },
          {
            label: texts.notDone,
            icon: CalendarX2,
            onPress: () => choose(reschedule.open),
          },
          {
            label: texts.cancel,
            icon: X,
            variant: 'secondary',
            onPress: () => choose(cancellation.open),
          },
        ]}
      />
    </View>
  );
}

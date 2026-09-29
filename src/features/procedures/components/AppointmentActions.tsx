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
import type {
  CancellationReasonLabels,
  CancellationReasonPreset,
} from '../domain/cancellationReasonPresets';
import type { AppointmentActionNotice } from '../domain/toCompletionOutcome';
import type { CancellationReasonError } from '../domain/validateCancellationReason';
import type { CancellationMode } from '../hooks/useAppointmentActions';

export type AppointmentActionsTexts = {
  open: string;
  complete: string;
  notDone: string;
  cancel: string;
  /** Vai na frente do motivo gravado de um não realizado. */
  notDonePrefix: string;
  toast: Record<CancellationMode, string>;
  notices: Record<AppointmentActionNotice, string>;
  cancellation: Omit<CancelAppointmentSheetTexts, 'title' | 'reason'> & {
    /** Título e pergunta mudam entre cancelar e não realizado. */
    byMode: Record<CancellationMode, { title: string; reason: string }>;
    errors: Record<CancellationReasonError | 'FAILED', string>;
  };
};

export type AppointmentActionsCancellation = {
  sheetVisible: boolean;
  preset: CancellationReasonPreset | null;
  reason: string;
  reasonError: CancellationReasonError | null;
  failed: boolean;
  mode: CancellationMode;
  open: (mode: CancellationMode) => void;
  close: () => void;
  setPreset: (preset: CancellationReasonPreset) => void;
  setReason: (reason: string) => void;
  confirm: (labels: CancellationReasonLabels, notDonePrefix: string) => void;
};

type AppointmentActionsProps = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  justCanceled: boolean;
  texts: AppointmentActionsTexts;
  onComplete: () => void;
  cancellation: AppointmentActionsCancellation;
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
          <Text className="text-sm text-label-primary">
            {texts.toast[cancellation.mode]}
          </Text>
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
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={texts.open}
        accessibilityState={{ disabled: submitting, busy: submitting }}
        onPress={() => setOptionsVisible(true)}
      >
        <Text className="font-semibold">{texts.open}</Text>
      </Button>
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
        texts={{
          ...texts.cancellation,
          ...texts.cancellation.byMode[cancellation.mode],
        }}
        onSelectPreset={cancellation.setPreset}
        onChangeReason={cancellation.setReason}
        onConfirm={() =>
          cancellation.confirm(reasonLabels, texts.notDonePrefix)
        }
        onClose={cancellation.close}
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
            onPress: () => choose(() => cancellation.open('notDone')),
          },
          {
            label: texts.cancel,
            icon: X,
            variant: 'secondary',
            onPress: () => choose(() => cancellation.open('cancel')),
          },
        ]}
      />
    </View>
  );
}

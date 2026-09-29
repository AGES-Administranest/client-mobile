import { Check, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import {
  CancelAppointmentSheet,
  type CancelAppointmentSheetTexts,
} from './CancelAppointmentSheet';
import type { AppointmentActionNotice } from '../domain/toCompletionOutcome';
import type { CancellationReasonError } from '../domain/validateCancellationReason';

export type AppointmentActionsTexts = {
  complete: string;
  cancel: string;
  notices: Record<AppointmentActionNotice, string>;
  cancellation: CancelAppointmentSheetTexts & {
    errors: Record<CancellationReasonError | 'FAILED', string>;
  };
};

// Mesmo formato do `cancellation` do useAppointmentActions, para a tela
// repassar o estado do hook sem remontar nada.
export type AppointmentActionsCancellation = {
  sheetVisible: boolean;
  reason: string;
  reasonError: CancellationReasonError | null;
  failed: boolean;
  open: () => void;
  close: () => void;
  setReason: (reason: string) => void;
  confirm: () => void;
};

type AppointmentActionsProps = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  texts: AppointmentActionsTexts;
  onComplete: () => void;
  cancellation: AppointmentActionsCancellation;
  className?: string;
};

// Avisos de que o agendamento já saiu de SCHEDULED: ocupam o lugar dos
// botões, que não têm mais o que fazer.
const TERMINAL_NOTICES: readonly AppointmentActionNotice[] = [
  'CANCELED',
  'COMPLETED',
];

export function AppointmentActions({
  visible,
  submitting,
  notice,
  texts,
  onComplete,
  cancellation,
  className,
}: AppointmentActionsProps) {
  if (!visible) {
    return null;
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

  const sheetError = cancellation.reasonError
    ? texts.cancellation.errors[cancellation.reasonError]
    : cancellation.failed
    ? texts.cancellation.errors.FAILED
    : null;

  return (
    <View className={cn('gap-3', className)}>
      <Button
        shape="pill"
        icon={Check}
        className="h-[49px] w-full"
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={texts.complete}
        accessibilityState={{ disabled: submitting, busy: submitting }}
        onPress={onComplete}
      >
        <Text className="font-semibold">{texts.complete}</Text>
      </Button>
      <Button
        shape="pill"
        variant="secondary"
        icon={Trash2}
        className="h-[49px] w-full"
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={texts.cancel}
        accessibilityState={{ disabled: submitting }}
        onPress={cancellation.open}
      >
        <Text className="font-semibold">{texts.cancel}</Text>
      </Button>
      {notice ? (
        <Text className="text-sm text-alert-primary">
          {texts.notices[notice]}
        </Text>
      ) : null}

      <CancelAppointmentSheet
        visible={cancellation.sheetVisible}
        reason={cancellation.reason}
        errorText={sheetError}
        submitting={submitting}
        texts={texts.cancellation}
        onChangeReason={cancellation.setReason}
        onConfirm={cancellation.confirm}
        onClose={cancellation.close}
      />
    </View>
  );
}

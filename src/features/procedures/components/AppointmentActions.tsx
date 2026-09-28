import { Check, CircleX } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
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

export type AppointmentActionsTexts = {
  complete: string;
  cancel: string;
  toast: string;
  notices: Record<AppointmentActionNotice, string>;
  cancellation: CancelAppointmentSheetTexts & {
    errors: Record<CancellationReasonError | 'FAILED', string>;
  };
};

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
        icon={CircleX}
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
    </View>
  );
}

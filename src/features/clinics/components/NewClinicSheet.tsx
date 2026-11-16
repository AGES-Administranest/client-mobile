import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { ClinicFields, type ClinicFieldTexts } from './ClinicFields';
import type { ClinicDraft, ClinicField } from '../domain/clinicForm';

const MAIN_FIELDS: readonly ClinicField[] = [
  'name',
  'cnpj',
  'addressLine',
  'city',
  'state',
];

type NewClinicStepTexts = {
  next: string;
  back: string;
  /** One per step, e.g. "Passo 1 de 2". */
  labels: [string, string];
};

type NewClinicSheetProps = {
  visible: boolean;
  draft: ClinicDraft;
  fieldErrors: Partial<Record<ClinicField, string>>;
  failureMessage: string | null;
  isSaving: boolean;
  title: string;
  fieldTexts: Record<ClinicField, ClinicFieldTexts>;
  confirmLabel: string;
  savingLabel: string;
  closeLabel: string;
  stepTexts: NewClinicStepTexts;
  onChangeField: (field: ClinicField, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onClosed?: () => void;
};

function NewClinicSheet({
  visible,
  draft,
  fieldErrors,
  failureMessage,
  isSaving,
  title,
  fieldTexts,
  confirmLabel,
  savingLabel,
  closeLabel,
  stepTexts,
  onChangeField,
  onSubmit,
  onClose,
  onClosed,
}: NewClinicSheetProps) {
  const [step, setStep] = useState<0 | 1>(0);

  const awaitingSubmitResult = useRef(false);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  // Um erro só aparece no passo do campo: depois de confirmar, leva para o
  // passo do erro em vez de deixar o submit falhar com o campo escondido.
  // Só reage logo após o submit — senão travaria o Voltar/Próximo.
  useEffect(() => {
    if (!awaitingSubmitResult.current) return;
    const failed = Object.keys(fieldErrors) as ClinicField[];
    if (failed.length === 0) return;
    awaitingSubmitResult.current = false;
    setStep(failed.some(field => MAIN_FIELDS.includes(field)) ? 0 : 1);
  }, [fieldErrors]);

  function submit(): void {
    awaitingSubmitResult.current = true;
    onSubmit();
  }

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      onClosed={onClosed}
      footer={
        <>
          {failureMessage ? (
            <View className="rounded-xl border border-alert-primary bg-white p-3">
              <Text className="text-sm text-alert-primary">
                {failureMessage}
              </Text>
            </View>
          ) : null}

          {step === 0 ? (
            <Button
              shape="pill"
              className="h-[49px] w-full bg-button-primary"
              onPress={() => setStep(1)}
            >
              <Icon as={ArrowRight} className="size-5" />
              <Text className="font-semibold">{stepTexts.next}</Text>
            </Button>
          ) : (
            <>
              <Button
                shape="pill"
                className="h-[49px] w-full bg-button-primary"
                onPress={submit}
                disabled={isSaving}
              >
                <Icon as={Check} className="size-5" />
                <Text className="font-semibold">
                  {isSaving ? savingLabel : confirmLabel}
                </Text>
              </Button>
              <Button
                shape="pill"
                className="h-[49px] w-full bg-button-primary"
                onPress={() => setStep(0)}
                disabled={isSaving}
              >
                <Icon as={ArrowLeft} className="size-5" />
                <Text className="font-semibold">{stepTexts.back}</Text>
              </Button>
            </>
          )}
        </>
      }
    >
      <Text className="mb-3 text-xs font-semibold text-label-tertiary">
        {stepTexts.labels[step]}
      </Text>
      <ClinicFields
        section={step === 0 ? 'main' : 'contact'}
        draft={draft}
        fieldErrors={fieldErrors}
        fieldTexts={fieldTexts}
        onChangeField={onChangeField}
      />
    </BottomSheet>
  );
}

export { NewClinicSheet };
export type { NewClinicSheetProps, NewClinicStepTexts };

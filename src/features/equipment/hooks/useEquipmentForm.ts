import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import {
  digitsOnly,
  formatCurrencyInput,
  formatDateInput,
} from 'shared/utils/inputMasks';

import type {
  EquipmentFormMode,
  EquipmentFormTarget,
} from '../domain/equipment.types';
import {
  buildCreateDto,
  buildUpdateDto,
  EMPTY_EQUIPMENT_FORM,
  equipmentToFormValues,
  legacyUsefulLifeMonths,
  usefulLifeDisplay,
  type UsefulLifeDisplay,
} from '../domain/equipmentFormMapping';
import {
  previewDepreciation,
  type DepreciationPreview,
} from '../domain/previewDepreciation';
import {
  parseAcquisitionDate,
  parsePurchaseValue,
  parseUsefulLifeYears,
  validateEquipmentForm,
  type EquipmentFormErrors,
  type EquipmentFormField,
  type EquipmentFormValues,
} from '../domain/validateEquipmentForm';
import { equipmentService } from '../services/equipmentService';

const MAX_USEFUL_LIFE_DIGITS = 3;

export type EquipmentSubmitError = 'session' | 'generic';

type UseEquipmentFormOptions = {
  target: EquipmentFormTarget;
  visible: boolean;
  /** Chamado só depois de salvar com sucesso; quem chama atualiza a lista e fecha o sheet. */
  onSaved: () => void | Promise<void>;
  /** AAAA-MM-DD, o dia local. Existe para o teste fixar o relógio. */
  today?: () => string;
};

type EquipmentFormState = {
  mode: EquipmentFormMode;
  values: EquipmentFormValues;
  /** Só depois de o campo ser visitado ou de um envio, para não acusar erro a cada tecla. */
  errors: EquipmentFormErrors;
  preview: DepreciationPreview | null;
  /** Enquanto o campo fica intocado, a prévia e o PATCH seguem estes meses em vez de arredondar para anos. */
  legacyLifeMonths: number | null;
  /** Só em `view`: o campo de anos não consegue mostrar meses quebrados, então a leitura mostra a unidade certa. */
  viewUsefulLife: UsefulLifeDisplay | null;
  isSubmitting: boolean;
  submitError: EquipmentSubmitError | null;
  onChangeText: (field: EquipmentFormField, text: string) => void;
  onBlur: (field: EquipmentFormField) => void;
  startEdit: () => void;
  submit: () => Promise<void>;
};

function localTodayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function initialValues(target: EquipmentFormTarget): EquipmentFormValues {
  return target.mode === 'create'
    ? EMPTY_EQUIPMENT_FORM
    : equipmentToFormValues(target.equipment);
}

function maskedValue(field: EquipmentFormField, text: string): string {
  switch (field) {
    case 'purchaseValue':
      return formatCurrencyInput(text);
    case 'acquisitionDate':
      return formatDateInput(text);
    case 'usefulLifeYears':
      return digitsOnly(text).slice(0, MAX_USEFUL_LIFE_DIGITS);
    default:
      return text;
  }
}

export function useEquipmentForm({
  target,
  visible,
  onSaved,
  today = localTodayIso,
}: UseEquipmentFormOptions): EquipmentFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [mode, setMode] = useState<EquipmentFormMode>(target.mode);
  const [values, setValues] = useState(() => initialValues(target));
  const [touched, setTouched] = useState<
    Partial<Record<EquipmentFormField, true>>
  >({});
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<EquipmentSubmitError | null>(
    null,
  );
  const isMounted = useRef(true);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Cada abertura começa do alvo (cadastro vazio, ou o equipamento em leitura)
  // e descarta o que ficou de uma edição que foi fechada sem salvar.
  useEffect(() => {
    if (!visible) return;
    setMode(target.mode);
    setValues(initialValues(target));
    setTouched({});
    setAttempted(false);
    setSubmitError(null);
  }, [visible, target]);

  const initial = useMemo(() => initialValues(target), [target]);
  const equipment = target.mode === 'create' ? null : target.equipment;
  const legacyMonths = equipment ? legacyUsefulLifeMonths(equipment) : null;
  const usefulLifeUntouched =
    values.usefulLifeYears === initial.usefulLifeYears;
  const legacyLifeMonths =
    mode === 'edit' && usefulLifeUntouched ? legacyMonths : null;

  const todayIso = today();
  const validation = validateEquipmentForm(values, todayIso);

  const errors = useMemo(() => {
    const shown: EquipmentFormErrors = {};
    if (mode === 'view') return shown;
    (Object.keys(validation.errors) as EquipmentFormField[]).forEach(field => {
      if (attempted || touched[field]) {
        (shown as Record<string, string | undefined>)[field] =
          validation.errors[field];
      }
    });
    return shown;
  }, [mode, validation.errors, attempted, touched]);

  const usefulLifeYears = parseUsefulLifeYears(values.usefulLifeYears);
  // Em leitura, o valor mensal é o que o back já calculou para o card.
  const viewPreview: DepreciationPreview | null =
    mode === 'view' && equipment
      ? {
          monthlyDepreciation: equipment.monthlyDepreciation,
          lifeEnded: equipment.endOfLife,
        }
      : null;
  const editPreview =
    usefulLifeYears === undefined
      ? null
      : previewDepreciation({
          purchaseValue: parsePurchaseValue(values.purchaseValue),
          usefulLifeYears,
          usefulLifeMonths: legacyLifeMonths,
          acquisitionDate: parseAcquisitionDate(values.acquisitionDate),
          salvageValue: equipment?.salvageValue ?? 0,
          today: todayIso,
        });
  const preview = mode === 'view' ? viewPreview : editPreview;

  const onChangeText = useCallback(
    (field: EquipmentFormField, text: string) => {
      if (mode === 'view') return;
      setValues(current => ({ ...current, [field]: maskedValue(field, text) }));
    },
    [mode],
  );

  const startEdit = useCallback(() => {
    setMode('edit');
    setTouched({});
    setAttempted(false);
    setSubmitError(null);
  }, []);

  const onBlur = useCallback((field: EquipmentFormField) => {
    setTouched(current => ({ ...current, [field]: true }));
  }, []);

  const submit = useCallback(async () => {
    if (mode === 'view' || isSubmittingRef.current) return;

    const { errors: found, normalized } = validateEquipmentForm(
      values,
      today(),
    );
    if (!normalized || Object.keys(found).length > 0) {
      setAttempted(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (!idToken) {
        throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
      }
      if (mode === 'edit' && equipment) {
        await equipmentService.update(
          idToken,
          equipment.id,
          buildUpdateDto(normalized, {
            legacyMonths,
            usefulLifeUntouched,
          }),
        );
      } else {
        await equipmentService.create(idToken, buildCreateDto(normalized));
      }
    } catch (error) {
      if (isMounted.current) {
        setSubmitError(
          error instanceof ApiError && error.status === 401
            ? 'session'
            : 'generic',
        );
      }
      isSubmittingRef.current = false;
      if (isMounted.current) setIsSubmitting(false);
      return;
    }

    isSubmittingRef.current = false;
    if (isMounted.current) setIsSubmitting(false);
    await onSaved();
  }, [
    mode,
    values,
    today,
    idToken,
    equipment,
    legacyMonths,
    usefulLifeUntouched,
    onSaved,
  ]);

  return {
    mode,
    values,
    errors,
    preview,
    legacyLifeMonths,
    viewUsefulLife:
      mode === 'view' && equipment
        ? usefulLifeDisplay(equipment.usefulLifeMonths)
        : null,
    isSubmitting,
    submitError,
    onChangeText,
    onBlur,
    startEdit,
    submit,
  };
}

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

export type EquipmentSubmitError = 'session' | 'generic' | 'delete';

// A exclusão passa por quatro passos para nunca haver dois Modal na tela: o
// sheet fecha, só então a confirmação abre, e ao cancelar o sheet só reabre
// depois de a confirmação fechar.
export type EquipmentDeleteStep =
  | 'idle'
  | 'closingSheet'
  | 'confirming'
  | 'closingConfirmation';

type UseEquipmentFormOptions = {
  target: EquipmentFormTarget;
  visible: boolean;
  /** Só depois de salvar com sucesso. Quem chama atualiza a lista; o cadastro fecha o sheet, e a edição volta ao detalhe com o equipamento novo. */
  onSaved: (savedMode: 'create' | 'edit') => void | Promise<void>;
  /** Só depois de excluir; quem chama fecha o formulário (o sheet não reabre) e atualiza a lista. */
  onDeleted: () => void | Promise<void>;
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
  /** O sheet some enquanto a exclusão está em andamento: use este no lugar de `visible`. */
  isSheetVisible: boolean;
  deleteStep: EquipmentDeleteStep;
  /** A confirmação continua aberta durante a chamada. */
  isDeleting: boolean;
  submitError: EquipmentSubmitError | null;
  onChangeText: (field: EquipmentFormField, text: string) => void;
  onBlur: (field: EquipmentFormField) => void;
  startEdit: () => void;
  submit: () => Promise<void>;
  cancelEdit: () => void;
  requestDelete: () => void;
  onSheetClosed: () => void;
  cancelDelete: () => void;
  onConfirmationClosed: () => void;
  confirmDelete: () => Promise<void>;
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
  onDeleted,
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
  const [deleteStep, setDeleteStep] = useState<EquipmentDeleteStep>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<EquipmentSubmitError | null>(
    null,
  );
  const isMounted = useRef(true);
  const isSubmittingRef = useRef(false);
  const isDeletingRef = useRef(false);

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
    setDeleteStep('idle');
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
    if (mode === 'view' || isSubmittingRef.current || isDeletingRef.current) {
      return;
    }

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
    if (isMounted.current) {
      setIsSubmitting(false);
      // Como em Clínicas, salvar uma edição volta ao detalhe sem fechar o sheet.
      if (mode === 'edit') setMode('view');
    }
    await onSaved(mode);
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

  const cancelEdit = useCallback(() => {
    if (mode !== 'edit' || isSubmittingRef.current) return;
    setMode('view');
    setValues(initialValues(target));
    setTouched({});
    setAttempted(false);
    setSubmitError(null);
  }, [mode, target]);

  const requestDelete = useCallback(() => {
    if (mode === 'view') {
      setDeleteStep(step => (step === 'idle' ? 'closingSheet' : step));
    }
  }, [mode]);

  const onSheetClosed = useCallback(() => {
    setDeleteStep(step => (step === 'closingSheet' ? 'confirming' : step));
  }, []);

  const cancelDelete = useCallback(() => {
    if (isDeletingRef.current) return;
    setSubmitError(null);
    setDeleteStep(step =>
      step === 'confirming' ? 'closingConfirmation' : step,
    );
  }, []);

  const onConfirmationClosed = useCallback(() => {
    setDeleteStep(step => (step === 'closingConfirmation' ? 'idle' : step));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (
      deleteStep !== 'confirming' ||
      mode !== 'view' ||
      !equipment ||
      isDeletingRef.current
    ) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeleting(true);
    setSubmitError(null);
    try {
      if (!idToken) {
        throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
      }
      await equipmentService.deactivate(idToken, equipment.id);
    } catch (error) {
      // Já não existe (outra aba, outro aparelho): o resultado que a pessoa
      // queria é o mesmo, então segue como sucesso e a lista nova decide.
      const alreadyGone =
        error instanceof ApiError && error.code === 'EQUIPMENT_NOT_FOUND';
      if (!alreadyGone) {
        if (isMounted.current) {
          setSubmitError(
            error instanceof ApiError && error.status === 401
              ? 'session'
              : 'delete',
          );
        }
        isDeletingRef.current = false;
        if (isMounted.current) setIsDeleting(false);
        return;
      }
    }

    isDeletingRef.current = false;
    if (isMounted.current) {
      setIsDeleting(false);
      // `onDeleted` fecha o formulário na parte síncrona; só então a
      // confirmação sai, para o sheet não reabrir.
    }
    const done = onDeleted();
    if (isMounted.current) setDeleteStep('idle');
    await done;
  }, [deleteStep, mode, equipment, idToken, onDeleted]);

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
    isSheetVisible: visible && deleteStep === 'idle',
    deleteStep,
    isDeleting,
    submitError,
    onChangeText,
    onBlur,
    startEdit,
    submit,
    cancelEdit,
    requestDelete,
    onSheetClosed,
    cancelDelete,
    onConfirmationClosed,
    confirmDelete,
  };
}

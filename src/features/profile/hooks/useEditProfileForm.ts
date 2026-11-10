import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';
import { isOnline } from 'shared/services/network';
import { toCalendarDate } from 'shared/utils/calendar';
import { formatDateInput } from 'shared/utils/inputMasks';
import { isNetworkError } from 'shared/utils/network';

import type { Profile, Sex } from '../domain/profile';
import {
  formatCrmvInput,
  profileToFormValues,
  toProfileUpdate,
  validateProfileForm,
  type ProfileFormErrors,
  type ProfileFormValues,
} from '../domain/validateProfileForm';
import {
  clearPendingProfileEdit,
  queueProfileEdit,
  saveCachedProfile,
} from '../services/profileCache';
import { updateProfile } from '../services/profileService';

export type EditProfileTextField = Exclude<keyof ProfileFormValues, 'sex'>;

export type EditProfileSubmitError = 'session' | 'generic';

type UseEditProfileFormOptions = {
  profile: Profile;
  visible: boolean;
  onSaved: (profile: Profile, savedOffline: boolean) => void;
};

export type EditProfileFormState = {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  canSave: boolean;
  isSaving: boolean;
  submitError: EditProfileSubmitError | null;
  onChangeText: (field: EditProfileTextField, text: string) => void;
  onChangeSex: (sex: Sex) => void;
  save: () => Promise<void>;
  reset: () => void;
};

function masked(field: EditProfileTextField, text: string): string {
  switch (field) {
    case 'crmv':
      return formatCrmvInput(text);
    case 'birthDate':
      return formatDateInput(text);
    default:
      return text;
  }
}

export function useEditProfileForm({
  profile,
  visible,
  onSaved,
}: UseEditProfileFormOptions): EditProfileFormState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const initial = useMemo(() => profileToFormValues(profile), [profile]);
  const [values, setValues] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<EditProfileSubmitError | null>(
    null,
  );

  const reset = useCallback(() => {
    setValues(initial);
    setSubmitError(null);
  }, [initial]);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const isDirty = (Object.keys(values) as (keyof ProfileFormValues)[]).some(
    field => values[field] !== initial[field],
  );
  const errors = useMemo(
    () =>
      isDirty ? validateProfileForm(values, toCalendarDate(new Date())) : {},
    [isDirty, values],
  );
  const canSave = isDirty && Object.keys(errors).length === 0 && !isSaving;

  const onChangeText = useCallback(
    (field: EditProfileTextField, text: string) =>
      setValues(current => ({ ...current, [field]: masked(field, text) })),
    [],
  );

  const onChangeSex = useCallback(
    (sex: Sex) => setValues(current => ({ ...current, sex })),
    [],
  );

  const save = useCallback(async () => {
    if (!canSave || !idToken || !userId) return;

    setIsSaving(true);
    setSubmitError(null);
    const update = toProfileUpdate(values);
    const saveOffline = async () =>
      onSaved(await queueProfileEdit(userId, update, profile), true);
    try {
      if (!(await isOnline())) {
        await saveOffline();
        return;
      }
      const saved = await updateProfile(idToken, update);
      await saveCachedProfile(userId, saved);
      await clearPendingProfileEdit(userId);
      onSaved(saved, false);
    } catch (error) {
      if (isNetworkError(error)) {
        await saveOffline();
        return;
      }
      setSubmitError(
        error instanceof ApiError && error.status === 401
          ? 'session'
          : 'generic',
      );
    } finally {
      setIsSaving(false);
    }
  }, [canSave, idToken, userId, values, profile, onSaved]);

  return {
    values,
    errors,
    canSave,
    isSaving,
    submitError,
    onChangeText,
    onChangeSex,
    save,
    reset,
  };
}

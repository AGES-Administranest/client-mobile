import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import type { TranslationKey } from 'shared/i18n';

import type {
  PricingSettings,
  PricingSettingsDraft,
  PricingSettingsErrors,
  PricingSettingsField,
} from '../domain/pricing.types';
import {
  toPricingSettingsDraft,
  validatePricingSettings,
} from '../domain/validatePricingSettings';
import { pricingService } from '../services/pricingService';

type UsePricingSettingsFormOptions = {
  initialSettings?: PricingSettings | null;
  onSaved?: (settings: PricingSettings) => void;
};

export type PricingSettingsFormState = {
  draft: PricingSettingsDraft;
  errors: PricingSettingsErrors;
  failure: TranslationKey | null;
  isSaving: boolean;
  savedSettings: PricingSettings | null;
  setField: (field: PricingSettingsField, value: string) => void;
  submit: () => Promise<PricingSettings | null>;
};

export function usePricingSettingsForm({
  initialSettings = null,
  onSaved,
}: UsePricingSettingsFormOptions = {}): PricingSettingsFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [draft, setDraft] = useState<PricingSettingsDraft>(() =>
    toPricingSettingsDraft(initialSettings),
  );
  const [errors, setErrors] = useState<PricingSettingsErrors>({});
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSettings, setSavedSettings] = useState<PricingSettings | null>(
    initialSettings,
  );
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const setField = useCallback((field: PricingSettingsField, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    const validation = validatePricingSettings(draft);
    setFailure(null);

    if (!validation.valid) {
      setErrors(validation.errors);
      return null;
    }

    setErrors({});
    if (!idToken) {
      setFailure('pricing.goalForm.failures.save');
      return null;
    }

    setIsSaving(true);
    try {
      const saved = await pricingService.saveSettings(
        idToken,
        validation.settings,
      );
      if (!isMounted.current) return null;
      setSavedSettings(saved);
      onSaved?.(saved);
      return saved;
    } catch {
      if (isMounted.current) setFailure('pricing.goalForm.failures.save');
      return null;
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [draft, idToken, onSaved]);

  return {
    draft,
    errors,
    failure,
    isSaving,
    savedSettings,
    setField,
    submit,
  };
}

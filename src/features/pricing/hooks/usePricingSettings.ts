import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { PricingSettings } from '../domain/pricing.types';
import { fetchPricingSettings } from '../services/pricingSettingsService';

export type PricingSettingsState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'configured'; settings: PricingSettings }
  | { status: 'error' };

export type UsePricingSettings = {
  state: PricingSettingsState;
  reload: () => void;
  // The goals form already has the saved values from the PUT, so it hands
  // them over instead of asking the API again.
  applySaved: (settings: PricingSettings) => void;
};

export function usePricingSettings(): UsePricingSettings {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<PricingSettingsState>({
    status: 'loading',
  });
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion(current => current + 1), []);
  const applySaved = useCallback(
    (settings: PricingSettings) => setState({ status: 'configured', settings }),
    [],
  );

  useEffect(() => {
    if (!idToken) {
      setState({ status: 'error' });
      return;
    }

    let isMounted = true;
    setState({ status: 'loading' });

    fetchPricingSettings(idToken)
      .then(settings => {
        if (!isMounted) return;
        setState(
          settings
            ? { status: 'configured', settings }
            : { status: 'unconfigured' },
        );
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, version]);

  return { state, reload, applySaved };
}

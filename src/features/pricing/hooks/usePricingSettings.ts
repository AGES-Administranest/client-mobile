import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  fetchPricingSettings,
  type PricingSettings,
} from '../services/pricingSettingsService';

export type PricingSettingsState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'configured'; settings: PricingSettings }
  | { status: 'error' };

export type UsePricingSettings = {
  state: PricingSettingsState;
  reload: () => void;
};

export function usePricingSettings(): UsePricingSettings {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [state, setState] = useState<PricingSettingsState>({
    status: 'loading',
  });
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion(current => current + 1), []);

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

  return { state, reload };
}

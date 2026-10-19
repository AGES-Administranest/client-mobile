import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  RECENT_INVOICES_LIMIT,
  type ServiceInvoice,
} from '../domain/serviceInvoice';
import { fetchRecentServiceInvoices } from '../services/serviceInvoiceService';

export type RecentServiceInvoicesState = {
  invoices: ServiceInvoice[];
  status: 'loading' | 'ready' | 'failed';
  refresh: () => void;
};

/** The few most recent invoices for the Reports tab. */
export function useRecentServiceInvoices(): RecentServiceInvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [status, setStatus] =
    useState<RecentServiceInvoicesState['status']>('loading');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!idToken) return;
    let isMounted = true;
    fetchRecentServiceInvoices(idToken, RECENT_INVOICES_LIMIT)
      .then(found => {
        if (!isMounted) return;
        setInvoices(found);
        setStatus('ready');
      })
      .catch(() => {
        if (isMounted) setStatus('failed');
      });
    return () => {
      isMounted = false;
    };
  }, [idToken, version]);

  const refresh = useCallback(() => {
    setStatus('loading');
    setVersion(current => current + 1);
  }, []);

  return { invoices, status, refresh };
}

import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  RECENT_INVOICES_LIMIT,
  type ServiceInvoice,
} from '../domain/serviceInvoice';
import { fetchRecentServiceInvoices } from '../services/serviceInvoiceService';

type RecentServiceInvoicesState = {
  invoices: ServiceInvoice[];
  status: 'loading' | 'ready' | 'failed';
};

export function useRecentServiceInvoices(): RecentServiceInvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [status, setStatus] =
    useState<RecentServiceInvoicesState['status']>('loading');

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
  }, [idToken]);

  return { invoices, status };
}

import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { ServiceInvoice } from '../domain/serviceInvoice';
import { fetchServiceInvoices } from '../services/serviceInvoiceService';

type ServiceInvoicesState = {
  invoices: ServiceInvoice[];
  status: 'loading' | 'ready' | 'failed';
};

export function useServiceInvoices(limit: number): ServiceInvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [status, setStatus] =
    useState<ServiceInvoicesState['status']>('loading');

  useEffect(() => {
    if (!idToken) return;
    let isMounted = true;
    fetchServiceInvoices(idToken, limit)
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
  }, [idToken, limit]);

  return { invoices, status };
}

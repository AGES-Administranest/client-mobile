import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { Invoice } from '../domain/invoice.types';
import { fetchInvoices } from '../services/invoiceService';

const RECENT_INVOICES_LIMIT = 5;

export type RecentInvoicesState = {
  invoices: Invoice[];
  status: 'loading' | 'ready' | 'failed';
};

export function useRecentInvoices(): RecentInvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] =
    useState<RecentInvoicesState['status']>('loading');

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let isMounted = true;

    fetchInvoices(idToken)
      .then(page => {
        if (!isMounted) return;
        setInvoices(page.items.slice(0, RECENT_INVOICES_LIMIT));
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

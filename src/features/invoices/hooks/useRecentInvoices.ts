import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import type { ReportInvoice } from '../domain/reportInvoice';
import { fetchReportInvoices } from '../services/reportInvoiceService';

const RECENT_INVOICES_LIMIT = 5;

export type RecentInvoicesState = {
  invoices: ReportInvoice[];
  status: 'loading' | 'ready' | 'failed';
};

export function useRecentInvoices(): RecentInvoicesState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [invoices, setInvoices] = useState<ReportInvoice[]>([]);
  const [status, setStatus] =
    useState<RecentInvoicesState['status']>('loading');

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let isMounted = true;

    fetchReportInvoices(idToken, RECENT_INVOICES_LIMIT)
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

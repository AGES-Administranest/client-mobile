import { useEffect, useState } from 'react';

import {
  ServiceInvoicesNavigator,
  type ServiceInvoiceRoute,
} from './ServiceInvoicesNavigator';
import { ServiceInvoiceUploadFlow } from './ServiceInvoiceUploadFlow';
import type { ServiceInvoiceUploadState } from '../hooks/useServiceInvoiceUpload';
import { notifyOfflineServiceInvoicesChanged } from '../services/offlineServiceInvoiceStore';

const LIST_ROUTE: ServiceInvoiceRoute = { name: 'list' };

type ServiceInvoicesFlowProps = {
  open: boolean;
  onClose: () => void;
  upload: ServiceInvoiceUploadState;
};

export function ServiceInvoicesFlow({
  open,
  onClose,
  upload,
}: ServiceInvoicesFlowProps) {
  const [stack, setStack] = useState<ServiceInvoiceRoute[]>([]);

  useEffect(() => {
    setStack(open ? [LIST_ROUTE] : []);
  }, [open]);

  function pop() {
    if (stack.length <= 1) {
      onClose();
      return;
    }
    setStack(current => current.slice(0, -1));
  }

  return (
    <ServiceInvoicesNavigator
      stack={stack}
      onPush={route => setStack(current => [...current, route])}
      onPop={pop}
      onAddInvoice={upload.start}
      overlay={
        <ServiceInvoiceUploadFlow
          upload={upload}
          showNotices={false}
          onInvoiceConfirmed={notifyOfflineServiceInvoicesChanged}
        />
      }
    />
  );
}

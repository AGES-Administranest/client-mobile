import { useEffect, useState } from 'react';

import {
  ServiceInvoicesNavigator,
  type ServiceInvoiceRoute,
} from './ServiceInvoicesNavigator';
import { ServiceInvoiceUploadFlow } from './ServiceInvoiceUploadFlow';
import type { ServiceInvoiceUploadState } from '../hooks/useServiceInvoiceUpload';

const LIST_ROUTE: ServiceInvoiceRoute = { name: 'list' };

type ServiceInvoicesFlowProps = {
  open: boolean;
  /** Opens straight on this note; going back closes the flow. */
  initialInvoiceId?: string | null;
  onClose: () => void;
  upload: ServiceInvoiceUploadState;
};

export function ServiceInvoicesFlow({
  open,
  initialInvoiceId = null,
  onClose,
  upload,
}: ServiceInvoicesFlowProps) {
  const [stack, setStack] = useState<ServiceInvoiceRoute[]>([]);

  useEffect(() => {
    if (!open) {
      setStack([]);
    } else if (initialInvoiceId) {
      // Opened from a note: back leaves the flow instead of landing on the list.
      setStack([{ name: 'detail', invoiceId: initialInvoiceId }]);
    } else {
      setStack([LIST_ROUTE]);
    }
  }, [open, initialInvoiceId]);

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
      overlay={<ServiceInvoiceUploadFlow upload={upload} showNotices={false} />}
    />
  );
}

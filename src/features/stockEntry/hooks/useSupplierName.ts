import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { fetchSuppliers } from 'features/materials';

type SupplierName = {
  /** The registered supplier's name, or the one printed on the document. */
  name: string | null;
  isRegistered: boolean;
};

export function useSupplierName(
  supplierId: string | null,
  printedName: string | null,
): SupplierName {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken || !supplierId) return;
    let isCurrent = true;
    fetchSuppliers(idToken)
      .then(suppliers => {
        if (!isCurrent) return;
        const supplier = suppliers.find(({ id }) => id === supplierId);
        setRegisteredName(supplier?.name ?? null);
      })
      // Without the list the header falls back to the name as printed.
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [idToken, supplierId]);

  return {
    name: registeredName ?? printedName,
    isRegistered: supplierId !== null,
  };
}

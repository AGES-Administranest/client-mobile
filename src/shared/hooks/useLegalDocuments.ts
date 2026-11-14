import { useCallback, useState } from 'react';

import {
  openLegalDocument,
  type LegalDocument,
} from 'shared/services/legalDocuments';

export type UseLegalDocumentsResult = {
  open: (document: LegalDocument) => Promise<void>;
  unavailable: boolean;
};

export function useLegalDocuments(): UseLegalDocumentsResult {
  const [unavailable, setUnavailable] = useState(false);

  const open = useCallback(async (document: LegalDocument) => {
    setUnavailable(!(await openLegalDocument(document)));
  }, []);

  return { open, unavailable };
}

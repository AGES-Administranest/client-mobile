import { useCallback, useState } from 'react';

import type { LegalDocument } from 'shared/legal/content';

export type UseLegalDocumentsResult = {
  current: LegalDocument | null;
  open: (document: LegalDocument) => void;
  close: () => void;
};

export function useLegalDocuments(): UseLegalDocumentsResult {
  const [current, setCurrent] = useState<LegalDocument | null>(null);
  const close = useCallback(() => setCurrent(null), []);

  return { current, open: setCurrent, close };
}

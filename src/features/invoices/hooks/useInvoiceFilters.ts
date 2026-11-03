import { useCallback, useState } from 'react';

import type { CalendarRange } from 'shared/utils/calendar';

import {
  EMPTY_INVOICE_FILTERS,
  hasActiveFilters,
  isRangeInverted,
  type InvoiceFilters,
} from '../domain/invoiceFilters';

export type InvoiceFiltersState = {
  filters: InvoiceFilters;
  isFiltering: boolean;
  isRangeInverted: boolean;
  setSearch: (search: string) => void;
  setRange: (range: CalendarRange) => void;
  clearFilters: () => void;
};

export function useInvoiceFilters(): InvoiceFiltersState {
  const [filters, setFilters] = useState<InvoiceFilters>(EMPTY_INVOICE_FILTERS);

  const setSearch = useCallback(
    (search: string) => setFilters(current => ({ ...current, search })),
    [],
  );

  const setRange = useCallback(
    (range: CalendarRange) => setFilters(current => ({ ...current, range })),
    [],
  );

  const clearFilters = useCallback(() => setFilters(EMPTY_INVOICE_FILTERS), []);

  return {
    filters,
    isFiltering: hasActiveFilters(filters),
    isRangeInverted: isRangeInverted(filters.range),
    setSearch,
    setRange,
    clearFilters,
  };
}

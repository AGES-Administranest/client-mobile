import {
  EMPTY_CALENDAR_RANGE,
  toCalendarDate,
  type CalendarRange,
} from 'shared/utils/calendar';

import type { Invoice } from './invoice.types';

export type InvoiceFilters = {
  search: string;
  range: CalendarRange;
};

export type InvoiceQuery = {
  search?: string;
  issuedFrom?: string;
  issuedTo?: string;
};

export const EMPTY_INVOICE_FILTERS: InvoiceFilters = {
  search: '',
  range: EMPTY_CALENDAR_RANGE,
};

export const MIN_SEARCH_LENGTH = 2;

export function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isRangeInverted({ from, to }: CalendarRange): boolean {
  return from !== null && to !== null && from > to;
}

export function toInvoiceQuery(filters: InvoiceFilters): InvoiceQuery {
  const query: InvoiceQuery = {};
  const search = filters.search.trim();

  if (search.length >= MIN_SEARCH_LENGTH) {
    query.search = search;
  }

  // An inverted period matches nothing; it is held back until it is fixed
  // instead of emptying the list.
  if (!isRangeInverted(filters.range)) {
    if (filters.range.from) {
      query.issuedFrom = filters.range.from;
    }

    if (filters.range.to) {
      query.issuedTo = filters.range.to;
    }
  }

  return query;
}

export function hasActiveFilters(filters: InvoiceFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.range.from !== null ||
    filters.range.to !== null
  );
}

function matchesSearch(
  invoice: Pick<Invoice, 'number' | 'takerName' | 'takerCnpj'>,
  search: string,
): boolean {
  const term = normalizeSearchTerm(search);

  if (
    normalizeSearchTerm(invoice.takerName).includes(term) ||
    normalizeSearchTerm(invoice.number).includes(term)
  ) {
    return true;
  }

  // A CNPJ is typed with or without its dots, slash and dash. Fewer digits
  // than the search minimum would match nearly every CNPJ.
  const digits = onlyDigits(term);

  return (
    digits.length >= MIN_SEARCH_LENGTH &&
    onlyDigits(invoice.takerCnpj).includes(digits)
  );
}

export function matchesFilters(
  invoice: Pick<Invoice, 'number' | 'takerName' | 'takerCnpj' | 'issuedAt'>,
  filters: InvoiceFilters,
): boolean {
  const query = toInvoiceQuery(filters);

  if (query.search !== undefined && !matchesSearch(invoice, query.search)) {
    return false;
  }

  const day = toCalendarDate(invoice.issuedAt);

  if (query.issuedFrom !== undefined && day < query.issuedFrom) {
    return false;
  }

  return !(query.issuedTo !== undefined && day > query.issuedTo);
}

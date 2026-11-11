export const REPORT_CATEGORIES = [
  'financial',
  'appointments',
  'clinics',
  'inventory',
  'suppliers',
  'travel',
  'depreciation',
  'workedHour',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type ReportHistoryItem = {
  id: string;
  fileName: string;
  generatedAt: string;
};

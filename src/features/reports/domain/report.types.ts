export type ReportCategory = 'financial' | 'appointments' | 'inventory';

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  'financial',
  'appointments',
  'inventory',
];

export type ReportHistoryItem = {
  id: string;
  fileName: string;
  generatedAt: string;
};

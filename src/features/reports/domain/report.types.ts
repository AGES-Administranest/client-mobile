export type ReportCategory = 'financial' | 'appointments' | 'inventory';

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  'financial',
  'appointments',
  'inventory',
];

export type ReportKind = 'GENERAL_REPORT' | 'TAX_PACKAGE';

export const REPORT_KINDS: readonly ReportKind[] = [
  'GENERAL_REPORT',
  'TAX_PACKAGE',
];

export type ReportPeriod = {
  from: string;
  to: string;
};

export type ReportHistoryItem = {
  id: string;
  kind: ReportKind;
  fileName: string | null;
  fileBytesSize: number | null;
  period: ReportPeriod | null;
  generatedAt: string;
};

export type ReportHistoryPage = {
  items: ReportHistoryItem[];
  hasMore: boolean;
};

export type ReportDownloadLink = {
  url: string;
  expiresAt: number;
};

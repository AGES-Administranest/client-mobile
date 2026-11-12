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

/** How the backend names each section of the general report (US29). */
export type ReportSection =
  | 'FINANCIAL'
  | 'APPOINTMENTS'
  | 'CLIENTS'
  | 'STOCK'
  | 'SUPPLIERS'
  | 'TRIPS'
  | 'DEPRECIATION'
  | 'HOURLY_RATE';

const SECTION_BY_CATEGORY: Record<ReportCategory, ReportSection> = {
  financial: 'FINANCIAL',
  appointments: 'APPOINTMENTS',
  clinics: 'CLIENTS',
  inventory: 'STOCK',
  suppliers: 'SUPPLIERS',
  travel: 'TRIPS',
  depreciation: 'DEPRECIATION',
  workedHour: 'HOURLY_RATE',
};

/** The sections to ask for, in the order of the document, without repeats. */
export function sectionsOf(
  categories: readonly ReportCategory[],
): ReportSection[] {
  return REPORT_CATEGORIES.filter(category =>
    categories.includes(category),
  ).map(category => SECTION_BY_CATEGORY[category]);
}

/** Keeps only names that are still categories: a stored list may be old. */
export function knownCategories(values: readonly unknown[]): ReportCategory[] {
  return REPORT_CATEGORIES.filter(category => values.includes(category));
}

/** What POST /reports answers (US28). */
export type GeneratedReport = {
  id: string;
  kind: 'GENERAL_REPORT';
  fileName: string;
  period: { from: string; to: string };
  sections: ReportSection[];
  generatedAt: string;
  /** Signed link to the PDF; it expires in minutes. */
  downloadUrl: string;
  downloadUrlExpiresAt: number;
  /** False when the profile has no CRMV: the header shows the name only. */
  professionalIdComplete: boolean;
};

export type ReportHistoryItem = {
  id: string;
  fileName: string;
  generatedAt: string;
  /** Ausente quando o arquivo não pôde ser salvo no aparelho (web). */
  fileUri?: string;
};

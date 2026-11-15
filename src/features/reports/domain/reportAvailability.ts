// `total` sums records of every section, so it only says whether the period is
// empty; it is not a count to show to the person.
export type ReportAvailability = {
  total: number;
};

export function hasReportRecords(availability: ReportAvailability): boolean {
  return availability.total > 0;
}

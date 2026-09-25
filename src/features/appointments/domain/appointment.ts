export type Appointment = {
  id: string;
  procedureName: string;
  /** ISO 8601 */
  startsAt: string;
  /** ISO 8601 */
  endsAt: string;
  client: { name: string };
  notes?: string | null;
};

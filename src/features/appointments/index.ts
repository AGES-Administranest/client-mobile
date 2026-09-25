export { AppointmentsScreen } from './screens/AppointmentsScreen';
export { AppointmentCalendar } from './components/AppointmentCalendar';
export { AppointmentDayList } from './components/AppointmentDayList';
export { useAppointments } from './hooks/useAppointments';
export { fetchAppointments } from './services/appointmentService';
export type {
  Appointment,
  AppointmentStatus,
  Species,
} from './domain/appointment';
export {
  groupAppointmentsByDate,
  formatAppointmentTime,
  formatAppointmentDateBadge,
  formatCurrency,
  isSameDay,
} from './domain/appointment';

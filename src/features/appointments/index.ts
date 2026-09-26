export { AppointmentFormSheet } from './components/AppointmentFormSheet';
export { ConflictAlertSheet } from './components/ConflictAlertSheet';
export { AppointmentFormScreen } from './screens/AppointmentFormScreen';
export { useAppointmentForm } from './hooks/useAppointmentForm';
export {
  createAppointment,
  readTimeConflict,
  updateAppointment,
} from './services/appointmentService';
export type {
  Appointment,
  AppointmentDraft,
  AppointmentErrors,
  AppointmentPayload,
  AsaClass,
  ConflictingAppointment,
  Species,
} from './domain/appointment';
// O resumo que o alerta exibe (procedimento + hora já formatada) é outro tipo
// que o `ConflictingAppointment` da API; o alias evita as duas exportações
// com o mesmo nome.
export type {
  ConflictAlertSheetProps,
  ConflictingAppointment as ConflictAlertAppointment,
} from './components/ConflictAlertSheet';
export type { ServiceTaker } from './services/serviceTakerService';

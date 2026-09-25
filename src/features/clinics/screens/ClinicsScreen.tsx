import { AppointmentDetailsScreen } from 'features/appointments';

// Provisório: até a US07 trazer a listagem/criação de agendamentos, a aba
// de clínicas mostra os detalhes de um agendamento de exemplo, só para
// demonstrar o fluxo de exportação para a agenda nativa.
const DEMO_APPOINTMENT_ID = 'demo-appointment-1';

export function ClinicsScreen() {
  return <AppointmentDetailsScreen appointmentId={DEMO_APPOINTMENT_ID} />;
}

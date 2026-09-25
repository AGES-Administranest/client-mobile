import type { Appointment } from '../domain/appointment';

// Stand-in até a US07 (listagem/criação de agendamentos) expor o endpoint real
// de agendamentos no backend — mesma assinatura async que o service real vai
// ter, para a troca ser só de implementação quando o endpoint existir.
export async function fetchAppointment(id: string): Promise<Appointment> {
  return Promise.resolve({
    id,
    procedureName: 'Ovariohisterectomia - Mel',
    startsAt: '2026-10-02T14:00:00',
    endsAt: '2026-10-02T15:30:00',
    client: { name: 'Ana Beatriz Souza' },
    notes: 'Paciente em jejum desde as 20h do dia anterior.',
  });
}

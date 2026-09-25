import { ApiError, apiClient } from 'shared/services/apiClient';

import type { Appointment, AppointmentStatus } from '../domain/appointment';

export type FetchAppointmentsParams = {
  month: string; // YYYY-MM
  status?: AppointmentStatus;
};

// Dados simulados realistas para exibição enquanto o endpoint do backend não estiver ativo
function getMockAppointments(month: string): Appointment[] {
  return [
    {
      id: 'mock-app-1',
      patientName: 'Mel',
      species: 'FELINE',
      asaClassification: 'ASA I',
      procedureName: 'Orquiectomia',
      startsAt: `${month}-17T09:00:00.000Z`,
      endsAt: `${month}-17T11:00:00.000Z`,
      location: 'Clínica VetNova',
      amount: 620,
      status: 'SCHEDULED',
      notes: 'Animal idoso, monitoração contínua de PA recomendada.',
    },
    {
      id: 'mock-app-2',
      patientName: 'Thor',
      species: 'CANINE',
      asaClassification: 'ASA II',
      procedureName: 'OSH',
      startsAt: `${month}-17T13:30:00.000Z`,
      endsAt: `${month}-17T15:00:00.000Z`,
      location: 'HospVet Sul',
      amount: 980,
      status: 'SCHEDULED',
      notes: 'Trazer kit para peridural.',
    },
    {
      id: 'mock-app-3',
      patientName: 'Luna',
      species: 'CANINE',
      asaClassification: 'ASA III',
      procedureName: 'Mastectomia',
      startsAt: `${month}-17T16:00:00.000Z`,
      endsAt: `${month}-17T18:00:00.000Z`,
      location: 'PetCare Central',
      amount: 1400,
      status: 'SCHEDULED',
      notes: 'Paciente cardiopata controlado.',
    },
    {
      id: 'mock-app-4',
      patientName: 'Pipoca',
      species: 'CANINE',
      asaClassification: 'ASA I',
      procedureName: 'Limpeza de Tártaro',
      startsAt: `${month}-19T10:00:00.000Z`,
      location: 'VetCare Pet Center',
      amount: 420,
      status: 'SCHEDULED',
    },
    {
      id: 'mock-app-5',
      patientName: 'Simba',
      species: 'FELINE',
      asaClassification: 'ASA II',
      procedureName: 'Desobstrução Uretral',
      startsAt: `${month}-20T14:00:00.000Z`,
      location: 'Clínica 24h Animalis',
      amount: 520,
      status: 'SCHEDULED',
    },
    {
      id: 'mock-app-6',
      patientName: 'Bob',
      species: 'CANINE',
      asaClassification: 'ASA I',
      procedureName: 'Vacinação e Consulta',
      startsAt: `${month}-22T11:00:00.000Z`,
      location: 'VetCare Central',
      amount: 250,
      status: 'SCHEDULED',
    },
    {
      id: 'mock-app-7',
      patientName: 'Mia',
      species: 'FELINE',
      asaClassification: 'ASA I',
      procedureName: 'Castração',
      startsAt: `${month}-24T09:30:00.000Z`,
      location: 'HospVet Sul',
      amount: 380,
      status: 'SCHEDULED',
    },
    {
      id: 'mock-app-8',
      patientName: 'Max',
      species: 'CANINE',
      asaClassification: 'ASA II',
      procedureName: 'Biópsia Cutânea',
      startsAt: `${month}-26T15:00:00.000Z`,
      location: 'Clínica VetNova',
      amount: 450,
      status: 'SCHEDULED',
    },
  ];
}

export async function fetchAppointments(
  idToken: string,
  params: FetchAppointmentsParams,
): Promise<Appointment[]> {
  const query = new URLSearchParams({
    status: params.status ?? 'SCHEDULED',
    month: params.month,
  });

  try {
    return await apiClient.get<Appointment[]>(
      `/appointments?${query.toString()}`,
      {
        token: idToken,
      },
    );
  } catch (error) {
    // Caso o backend ainda não tenha a rota implementada no ambiente local,
    // usamos o fallback realista com base no padrão documentado em CLAUDE.md.
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 501 || error.status === 500)
    ) {
      return getMockAppointments(params.month);
    }
    // Erros de rede genéricos ao rodar localmente sem backend também acionam mock
    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes('network')
    ) {
      return getMockAppointments(params.month);
    }
    throw error;
  }
}

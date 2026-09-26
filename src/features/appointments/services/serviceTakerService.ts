/** Local / tomador de serviço: o `Client` do backend (clínica ou tutor). */
export type ServiceTaker = {
  id: string;
  name: string;
};

// Stand-in: a task pede "o mesmo seletor de US05", que ainda não existe no app,
// e o módulo de clientes do backend (branch feat/US16-client-module) ainda não
// expõe listagem. A assinatura é a da chamada real —
// apiClient.get<ServiceTaker[]>('/client', { token: idToken }) — e o seletor
// desta folha deve dar lugar ao da US05 quando ele entrar.
const SERVICE_TAKERS: ServiceTaker[] = [
  { id: '6f1c2a9e-1b7d-4c3e-9a51-0d2f8e7b6c41', name: 'Clínica Vida Animal' },
  {
    id: 'a3e87d52-5c0f-4b19-8e6a-7f4d21c9b0e3',
    name: 'Hospital Veterinário Pet Care',
  },
  { id: 'd9b4f1c6-2e8a-47d5-b3c0-5a1e9f7d8c24', name: 'Clínica São Francisco' },
];

export async function fetchServiceTakers(
  _idToken: string,
): Promise<ServiceTaker[]> {
  return Promise.resolve(SERVICE_TAKERS);
}

export type Clinic = {
  id: string;
  name: string;
  city: string;
  state: string;
};

// Stand-in until the clinics endpoint exists; keeps the signature the real
// call will have (token in, list out).
export async function fetchClinics(_idToken: string): Promise<Clinic[]> {
  return Promise.resolve([
    { id: '1', name: 'Clínica VetNova', city: 'São Paulo', state: 'SP' },
    { id: '2', name: 'HospVet Sul', city: 'São Paulo', state: 'SP' },
    { id: '3', name: 'PetCare Central', city: 'São Paulo', state: 'SP' },
    { id: '4', name: 'Animalia Vet', city: 'São Paulo', state: 'SP' },
  ]);
}

import { ApiError } from 'shared/services/apiClient';

import type { FixedCostCategory } from '../domain/fixedCost';

export type CreateFixedCostPayload = {
  description: string;
  monthlyAmount: number;
  category: FixedCostCategory;
};

export type UpdateFixedCostPayload = Partial<CreateFixedCostPayload> & {
  active?: boolean;
};

export type CreatedFixedCost = CreateFixedCostPayload & {
  id: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListFixedCostsParams = {
  month: string;
  includeInactive: boolean;
};

function requireToken(idToken: string): void {
  if (!idToken) {
    throw new ApiError('No active session', 'UNAUTHENTICATED', 401);
  }
}

// Mesmos custos fixos que a tela de listagem (US18) mostra por padrão — só
// para a tela não abrir vazia enquanto o endpoint real não existe. Troca
// direta por `apiClient.get('/fixed-cost?...')` quando o backend expuser a
// rota (ver comentário de `createFixedCost` abaixo).
const SEED_FIXED_COSTS: CreatedFixedCost[] = [
  {
    id: 'local:seed-1',
    description: 'Aluguel do consultório',
    category: 'RENT',
    monthlyAmount: 1200,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'local:seed-2',
    description: 'Internet',
    category: 'INTERNET',
    monthlyAmount: 150,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'local:seed-3',
    description: 'Contador',
    category: 'ACCOUNTANT',
    monthlyAmount: 350,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// Stand-in: não existe endpoint de custos fixos no backend ainda (nenhum
// controller/DTO em src/modules/financial). `month`/`includeInactive` já
// seguem a mesma assinatura que `GET /fixed-cost?month=&includeInactive=`
// vai usar quando existir.
export async function listFixedCosts(
  idToken: string,
  { includeInactive }: ListFixedCostsParams,
): Promise<CreatedFixedCost[]> {
  requireToken(idToken);
  return includeInactive
    ? SEED_FIXED_COSTS
    : SEED_FIXED_COSTS.filter(fixedCost => fixedCost.active);
}

// Stand-in: não existe endpoint de custos fixos no backend ainda (nenhum
// controller/DTO em src/modules/financial). Mantém a mesma assinatura
// (idToken, payload) que a chamada real vai usar — troca é só a
// implementação, igual o README pede ("Calling the API").
export async function createFixedCost(
  idToken: string,
  payload: CreateFixedCostPayload,
): Promise<CreatedFixedCost> {
  requireToken(idToken);
  const now = new Date().toISOString();
  return {
    ...payload,
    id: `local:${Date.now().toString(36)}`,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

// Também cobre "inativar" (US18): quem chama manda só `{ active: false }`.
// Um PATCH real faria o merge no servidor; este stub não tem onde guardar
// estado entre chamadas, então só confirma o `id` e o novo `updatedAt` — é
// responsabilidade de quem chama (o hook) já saber o resto do registro.
export async function updateFixedCost(
  idToken: string,
  id: string,
  _payload: UpdateFixedCostPayload,
): Promise<Pick<CreatedFixedCost, 'id' | 'updatedAt'>> {
  requireToken(idToken);
  return { id, updatedAt: new Date().toISOString() };
}

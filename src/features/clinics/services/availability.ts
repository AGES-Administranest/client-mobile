import { isProductionBuild } from 'shared/utils/appEnv';

// O histórico ainda vem do clientHistoryStub.ts: em produção mostraria
// atendimentos inventados numa conta real. Quando o clientService chamar as
// rotas do tomador, isto passa a ser `true`.
export function isClientHistoryAvailable(): boolean {
  return !isProductionBuild();
}

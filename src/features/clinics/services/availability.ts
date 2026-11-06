import { isProductionBuild } from 'shared/utils/appEnv';

// O histórico ainda vem do clientHistoryStub.ts, com atendimentos inventados.
// Fora do desenvolvimento ele só aparece com EXPO_PUBLIC_CLIENT_HISTORY_STUB
// ligada de propósito, porque um release feito por EAS, CI ou `expo export`
// não passa pelos scripts `:production`. No build de produção nunca aparece:
// o `with-production-env.js` só troca as variáveis dele, e uma esquecida no
// `.env` entraria junto. Quando o clientService chamar as rotas do tomador,
// isto passa a ser `true`.
export function isClientHistoryAvailable(): boolean {
  return (
    !isProductionBuild() &&
    (__DEV__ || process.env.EXPO_PUBLIC_CLIENT_HISTORY_STUB === 'true')
  );
}

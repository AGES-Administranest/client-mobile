// MOCK: remover quando POST /pricing/procedure-estimate for aprovado
import { ApiError } from 'shared/services/apiClient';

import type {
  ProcedureEstimateDto,
  ProcedureEstimateResponse,
} from '../domain/pricing.types';

export type ProcedureEstimateMockScenario =
  | 'normal'
  | 'semConfiguracao'
  | 'erro';

/**
 * Cenário ativo do mock para testes.
 * 'normal': simulação de sucesso com cálculo verossímil
 * 'semConfiguracao': lança 409 PRICING_SETTINGS_NOT_FOUND para testar redirecionamento
 * 'erro': simula erro de comunicação com o servidor
 */
export const PROCEDURE_ESTIMATE_MOCK_SCENARIO: ProcedureEstimateMockScenario =
  'normal';

/**
 * Simulação mockada do endpoint POST /pricing/procedure-estimate.
 * Possui a mesma assinatura e tipos de entrada/saída do endpoint real.
 */
export async function estimateProcedureMock(
  _idToken: string,
  dto: ProcedureEstimateDto,
): Promise<ProcedureEstimateResponse> {
  if (PROCEDURE_ESTIMATE_MOCK_SCENARIO === 'semConfiguracao') {
    throw new ApiError(
      'Configuração de honorários não encontrada',
      'PRICING_SETTINGS_NOT_FOUND',
      409,
    );
  }

  if (PROCEDURE_ESTIMATE_MOCK_SCENARIO === 'erro') {
    throw new Error('Falha simulada de comunicação de rede');
  }

  // Simula latência de ~400ms para exercitar o estado de loading
  await new Promise(resolve => setTimeout(() => resolve(undefined), 400));

  const hourlyRateUsed = 120.0;
  const minimumHourlyRateUsed = 108.0;

  // Parcela de horas = valor da hora * durationMinutes / 60
  const hoursCostNum =
    Math.round(((hourlyRateUsed * dto.durationMinutes) / 60) * 100) / 100;

  // Deslocamento determinístico:
  // Sem clientId -> 0 e tripEstimateAvailable = false
  // Com clientId -> se o código do último caractere for par, retorna R$ 45,00 e tripEstimateAvailable = true;
  // se for ímpar, retorna 0 e tripEstimateAvailable = false (para testar tomador sem deslocamentos registrados).
  let tripCostNum = 0;
  let tripEstimateAvailable = false;
  let tripEstimateDays = 0;

  if (dto.clientId) {
    const lastCharCode = dto.clientId.charCodeAt(dto.clientId.length - 1);
    if (lastCharCode % 2 === 0) {
      tripCostNum = 45.0;
      tripEstimateAvailable = true;
      tripEstimateDays = 3;
    } else {
      tripCostNum = 0.0;
      tripEstimateAvailable = false;
      tripEstimateDays = 0;
    }
  }

  // Insumos: soma de quantidade * custo unitário padrão (R$ 25,00 por item como valor fixo verossímil)
  let suppliesCostNum = 0;
  const suppliesWithoutCost: string[] = [];

  if (dto.supplies && dto.supplies.length > 0) {
    for (const supply of dto.supplies) {
      const unitCost = 25.0;
      suppliesCostNum += supply.quantity * unitCost;
    }
    suppliesCostNum = Math.round(suppliesCostNum * 100) / 100;
  }

  const minimumPriceNum =
    Math.round((hoursCostNum + tripCostNum + suppliesCostNum) * 100) / 100;

  const breakEvenHoursNum =
    Math.round(((minimumHourlyRateUsed * dto.durationMinutes) / 60) * 100) /
    100;
  const breakEvenPriceNum =
    Math.round((breakEvenHoursNum + tripCostNum + suppliesCostNum) * 100) / 100;

  const now = new Date();

  return {
    minimumPrice: minimumPriceNum.toFixed(2),
    breakEvenPrice: breakEvenPriceNum.toFixed(2),
    hoursCost: hoursCostNum.toFixed(2),
    tripCost: tripCostNum.toFixed(2),
    suppliesCost: suppliesCostNum.toFixed(2),
    hourlyRateUsed: hourlyRateUsed.toFixed(2),
    minimumHourlyRateUsed: minimumHourlyRateUsed.toFixed(2),
    tripEstimateAvailable,
    tripEstimateDays,
    suppliesWithoutCost,
    durationMinutes: dto.durationMinutes,
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

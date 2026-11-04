import type { ProcedureEstimateResponse } from './pricing.types';
import {
  formatDurationDisplay,
  fromDurationMinutes,
  mapProcedureEstimate,
  toDurationMinutes,
  validateDuration,
} from './procedureEstimate';

describe('procedureEstimate domain', () => {
  describe('toDurationMinutes and fromDurationMinutes', () => {
    it('converts hours and minutes to total minutes', () => {
      expect(toDurationMinutes(0, 45)).toBe(45);
      expect(toDurationMinutes(1, 0)).toBe(60);
      expect(toDurationMinutes(2, 30)).toBe(150);
      expect(toDurationMinutes(0, 0)).toBe(0);
    });

    it('decomposes total minutes into hours and minutes', () => {
      expect(fromDurationMinutes(45)).toEqual({ hours: 0, minutes: 45 });
      expect(fromDurationMinutes(60)).toEqual({ hours: 1, minutes: 0 });
      expect(fromDurationMinutes(150)).toEqual({ hours: 2, minutes: 30 });
      expect(fromDurationMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    });
  });

  describe('validateDuration', () => {
    it('rejects when both fields are empty', () => {
      const result = validateDuration('', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Informe a duração estimada');
    });

    it('rejects non-integer characters', () => {
      expect(validateDuration('abc', '0').isValid).toBe(false);
      expect(validateDuration('1', 'xyz').isValid).toBe(false);
      expect(validateDuration('1.5', '0').isValid).toBe(false);
      expect(validateDuration('-1', '0').isValid).toBe(false);
    });

    it('rejects minutes outside 0..59', () => {
      const result = validateDuration('1', '60');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Os minutos devem ser entre 0 e 59');

      const negativeMin = validateDuration('1', '-5');
      expect(negativeMin.isValid).toBe(false);
    });

    it('rejects total duration <= 0', () => {
      const result = validateDuration('0', '0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A duração deve ser maior que zero');
    });

    it('rejects total duration > 1440 minutes', () => {
      const result = validateDuration('25', '0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'A duração máxima é de 24 horas (1440 minutos)',
      );
    });

    it('accepts valid durations', () => {
      expect(validateDuration('1', '30')).toEqual({
        isValid: true,
        durationMinutes: 90,
        error: null,
      });

      expect(validateDuration('2', '')).toEqual({
        isValid: true,
        durationMinutes: 120,
        error: null,
      });

      expect(validateDuration('', '45')).toEqual({
        isValid: true,
        durationMinutes: 45,
        error: null,
      });
    });
  });

  describe('formatDurationDisplay', () => {
    it('formats display strings for different durations', () => {
      expect(formatDurationDisplay(0)).toBe('0min');
      expect(formatDurationDisplay(45)).toBe('45min');
      expect(formatDurationDisplay(60)).toBe('1h');
      expect(formatDurationDisplay(90)).toBe('1h30');
      expect(formatDurationDisplay(125)).toBe('2h05');
      expect(formatDurationDisplay(150)).toBe('2h30');
    });
  });

  describe('mapProcedureEstimate', () => {
    it('maps response DTO strings to domain numeric fields', () => {
      const dto: ProcedureEstimateResponse = {
        minimumPrice: '131.47',
        breakEvenPrice: '126.28',
        hoursCost: '57.12',
        tripCost: '49.35',
        suppliesCost: '25.00',
        hourlyRateUsed: '38.08',
        minimumHourlyRateUsed: '34.62',
        tripEstimateAvailable: true,
        tripEstimateDays: 2,
        suppliesWithoutCost: ['item-1'],
        durationMinutes: 90,
        month: 11,
        year: 2026,
      };

      const mapped = mapProcedureEstimate(dto);

      expect(mapped).toEqual({
        minimumPrice: 131.47,
        breakEvenPrice: 126.28,
        hoursCost: 57.12,
        tripCost: 49.35,
        suppliesCost: 25.0,
        hourlyRateUsed: 38.08,
        minimumHourlyRateUsed: 34.62,
        tripEstimateAvailable: true,
        tripEstimateDays: 2,
        suppliesWithoutCost: ['item-1'],
        durationMinutes: 90,
        month: 11,
        year: 2026,
      });
    });

    it('handles undefined suppliesWithoutCost safely', () => {
      const dto = {
        minimumPrice: '100.00',
        breakEvenPrice: '90.00',
        hoursCost: '100.00',
        tripCost: '0.00',
        suppliesCost: '0.00',
        hourlyRateUsed: '50.00',
        minimumHourlyRateUsed: '45.00',
        tripEstimateAvailable: false,
        tripEstimateDays: 0,
        durationMinutes: 120,
        month: 11,
        year: 2026,
      } as unknown as ProcedureEstimateResponse;

      const mapped = mapProcedureEstimate(dto);

      expect(mapped.suppliesWithoutCost).toEqual([]);
      expect(mapped.minimumPrice).toBe(100);
      expect(mapped.tripEstimateAvailable).toBe(false);
    });
  });
});

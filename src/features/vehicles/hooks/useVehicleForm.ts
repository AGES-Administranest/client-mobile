import { useEffect, useState } from 'react';

import { calculateCostPerKm } from '../domain/calculateCostPerKm';
import {
  EMPTY_VEHICLE_FORM,
  isVehicleFormValid,
  validateVehicleForm,
  type VehicleFormErrors,
  type VehicleFormValues,
} from '../domain/validateVehicleForm';
import type {
  CreateVehicleDto,
  Vehicle,
  VehicleFormMode,
} from '../domain/vehicle.types';
import { vehicleService } from '../services/vehicleService';

export type UseVehicleFormOptions = {
  vehicle?: Vehicle | null;
  mode?: VehicleFormMode;
  token?: string;
  onSuccess?: (vehicle: Vehicle) => void;
  onInactivateSuccess?: (vehicleId: string) => void;
};

export function useVehicleForm(options: UseVehicleFormOptions = {}) {
  const {
    vehicle,
    mode: initialMode,
    token = '',
    onSuccess,
    onInactivateSuccess,
  } = options;

  const [mode, setMode] = useState<VehicleFormMode>(
    initialMode ?? (vehicle ? 'view' : 'create'),
  );

  const [values, setValues] = useState<VehicleFormValues>(() => {
    if (vehicle) {
      return {
        brand: vehicle.brand,
        model: vehicle.model,
        fuelType: vehicle.fuelType,
        avgConsumptionKmL: vehicle.avgConsumptionKmL,
        fuelPrice: vehicle.fuelPrice,
      };
    }
    return EMPTY_VEHICLE_FORM;
  });

  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setValues({
        brand: vehicle.brand,
        model: vehicle.model,
        fuelType: vehicle.fuelType,
        avgConsumptionKmL: vehicle.avgConsumptionKmL,
        fuelPrice: vehicle.fuelPrice,
      });
      setMode(initialMode ?? 'view');
    } else {
      setValues(EMPTY_VEHICLE_FORM);
      setMode(initialMode ?? 'create');
    }
    setErrors({});
    setSubmitError(null);
  }, [vehicle, initialMode]);

  function setFieldValue<K extends keyof VehicleFormValues>(
    key: K,
    value: VehicleFormValues[K],
  ): void {
    setValues(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function reset(newVehicle?: Vehicle | null, newMode?: VehicleFormMode): void {
    if (newVehicle) {
      setValues({
        brand: newVehicle.brand,
        model: newVehicle.model,
        fuelType: newVehicle.fuelType,
        avgConsumptionKmL: newVehicle.avgConsumptionKmL,
        fuelPrice: newVehicle.fuelPrice,
      });
      setMode(newMode ?? 'view');
    } else {
      setValues(EMPTY_VEHICLE_FORM);
      setMode(newMode ?? 'create');
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }

  const costPerKmEstimate = calculateCostPerKm(
    values.fuelPrice,
    values.avgConsumptionKmL,
  );

  async function submit(): Promise<boolean> {
    setSubmitError(null);
    const formErrors = validateVehicleForm(values);
    if (!isVehicleFormValid(formErrors)) {
      setErrors(formErrors);
      return false;
    }

    setSubmitting(true);
    try {
      const payload: CreateVehicleDto = {
        brand: values.brand.trim(),
        model: values.model.trim(),
        fuelType: values.fuelType,
        avgConsumptionKmL: parseFloat(
          values.avgConsumptionKmL.trim().replace(',', '.'),
        ),
        fuelPrice: parseFloat(values.fuelPrice.trim().replace(',', '.')),
      };

      if (mode === 'edit' && vehicle?.id) {
        const updated = await vehicleService.update(token, vehicle.id, payload);
        onSuccess?.(updated);
        return true;
      }

      const created = await vehicleService.create(token, payload);
      onSuccess?.(created);
      return true;
    } catch {
      setSubmitError('submitFailed');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function inactivate(): Promise<boolean> {
    if (!vehicle?.id) return false;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await vehicleService.inactivate(token, vehicle.id);
      onInactivateSuccess?.(vehicle.id);
      return true;
    } catch {
      setSubmitError('inactivateFailed');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    mode,
    setMode,
    values,
    setFieldValue,
    errors,
    submitting,
    submitError,
    costPerKmEstimate,
    submit,
    inactivate,
    reset,
  };
}

export { VehicleCard } from './components/VehicleCard';
export {
  VehicleFormSheet,
  type VehicleFormTexts,
} from './components/VehicleFormSheet';
export { calculateCostPerKm } from './domain/calculateCostPerKm';
export { formatConsumption, formatCostPerKm } from './domain/formatCostPerKm';
export {
  isVehicleFormValid,
  validateVehicleForm,
  type VehicleFormErrors,
  type VehicleFormValues,
} from './domain/validateVehicleForm';
export type {
  CreateVehicleDto,
  FuelType,
  UpdateVehicleDto,
  Vehicle,
  VehicleFormMode,
} from './domain/vehicle.types';
export {
  useVehicleForm,
  type UseVehicleFormOptions,
} from './hooks/useVehicleForm';
export {
  useVehicles,
  type UseVehiclesOptions,
  type UseVehiclesResult,
} from './hooks/useVehicles';
export {
  VehiclesScreen,
  type VehiclesScreenProps,
} from './screens/VehiclesScreen';
export {
  createVehicle,
  fetchVehicles,
  inactivateVehicle,
  updateVehicle,
  vehicleService,
} from './services/vehicleService';

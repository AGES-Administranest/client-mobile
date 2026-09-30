export { MaterialsScreen } from './screens/MaterialsPage';
export { useMaterialsScreen } from './hooks/useMaterialsScreen';
export {
  fetchItems,
  searchItems,
  createItem,
  updateItem,
  deleteItem,
} from './services/itemService';
export {
  backendUnitLabel,
  CATEGORY_OPTIONS,
  toBackendUnit,
  UNIT_OPTIONS,
} from './domain/materialsFilter';
export { fetchSuppliers } from './services/supplierService';
export { createItemLot } from './services/itemLotService';
export type { Supplier } from './services/supplierService';
export type {
  MaterialItem,
  MaterialSegment,
  BackendItem,
} from './domain/materialsFilter';

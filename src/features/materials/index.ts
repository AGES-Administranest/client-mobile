export { MaterialsScreen } from './screens/MaterialsPage';
export { useMaterialsScreen } from './hooks/useMaterialsScreen';
export {
  fetchItems,
  searchItems,
  createItem,
  updateItem,
  deleteItem,
} from './services/itemService';
export { backendUnitLabel } from './domain/materialsFilter';
export { createItemLot } from './services/itemLotService';
export type {
  MaterialItem,
  MaterialSegment,
  BackendItem,
} from './domain/materialsFilter';

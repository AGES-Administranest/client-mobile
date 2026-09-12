export { MaterialsScreen } from './screens/MaterialsPage';
export { useMaterialsScreen } from './hooks/useMaterialsScreen';
export {
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
} from './services/itemService';
export { createItemLot } from './services/itemLotService';
export type {
  MaterialItem,
  MaterialSegment,
  BackendItem,
} from './domain/materialsFilter';

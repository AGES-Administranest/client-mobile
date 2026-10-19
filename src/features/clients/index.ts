export { ClientAutocomplete } from './components/ClientAutocomplete';
export type { ClientAutocompleteMessages } from './components/ClientAutocomplete';
export type { Client, ClientOption } from './domain/client';
export type { ClientSearchStatus } from './domain/clientSearch';
export { useClientSearch } from './hooks/useClientSearch';
export { useClientNames } from './hooks/useClientNames';
export {
  isLocalClientId,
  type ClientSyncRejection,
  type LocalClientResolution,
  type OfflineClientChanges,
  type OfflineDuplicates,
  type OfflineClientPayload,
} from './domain/offlineClients';
export {
  findOfflineDuplicates,
  loadClientOutbox,
  loadClientRejections,
  loadClientsWithOffline,
  queueClinicCreate,
  queueClinicUpdate,
  resolveLocalClientId,
  saveClientRejections,
  subscribeOfflineClients,
  type LoadedClients,
} from './services/offlineClientStore';
export {
  syncPendingClinics,
  type ClinicSyncResult,
} from './services/clinicSyncService';

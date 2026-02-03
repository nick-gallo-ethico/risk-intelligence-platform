// =============================================================================
// Storage Module - Barrel Export
// =============================================================================

export { ModuleStorageModule } from "./storage.module";
export {
  ModuleStorageService,
  UploadFileParams,
  UploadFileResult,
} from "./storage.service";
export {
  DocumentProcessingService,
  TextExtractionResult,
} from "./document-processing.service";
export { StorageController } from "./storage.controller";
export * from "./dto";
export {
  StorageProvider,
  STORAGE_PROVIDER,
} from "./providers/storage-provider.interface";

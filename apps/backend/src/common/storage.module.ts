// =============================================================================
// STORAGE MODULE - File storage services
// =============================================================================
//
// This module provides file storage capabilities for the platform.
// Uses LocalStorageAdapter for development and can be configured for
// AzureBlobAdapter in production.
//
// EXPORTS:
// - StorageService: Main service for file operations with validation
// - STORAGE_ADAPTER: Token for injecting custom storage adapters
// =============================================================================

import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StorageService, STORAGE_ADAPTER } from "./services/storage.service";
import { LocalStorageAdapter } from "./services/local-storage.adapter";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Use LocalStorageAdapter for development
    // In production, this would be swapped for AzureBlobAdapter
    {
      provide: STORAGE_ADAPTER,
      useClass: LocalStorageAdapter,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_ADAPTER],
})
export class StorageModule {}

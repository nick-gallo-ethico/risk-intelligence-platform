// =============================================================================
// STORAGE MODULE - File storage with provider abstraction
// =============================================================================
//
// This module provides file storage capabilities with:
// 1. Provider abstraction (Azure Blob for production, Local for development)
// 2. Per-tenant container isolation
// 3. Attachment tracking in database
// 4. Document processing for text extraction (search indexing)
//
// CONFIGURATION:
// Set STORAGE_PROVIDER=azure for production or STORAGE_PROVIDER=local for development.
// Azure requires AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.
//
// EXPORTS:
// - ModuleStorageService: Main service for file operations with Attachment tracking
// - DocumentProcessingService: Text extraction for search indexing
// - STORAGE_PROVIDER: Injection token for the storage provider
// =============================================================================

import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ModuleStorageService } from "./storage.service";
import { DocumentProcessingService } from "./document-processing.service";
import { StorageController } from "./storage.controller";
import { AzureBlobProvider } from "./providers/azure-blob.provider";
import { LocalStorageProvider } from "./providers/local-storage.provider";
import { STORAGE_PROVIDER } from "./providers/storage-provider.interface";

@Global()
@Module({
  providers: [
    // Dynamic provider selection based on configuration
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>("storage.provider", "local");

        if (provider === "azure") {
          const azureProvider = new AzureBlobProvider(configService);
          // Manually call onModuleInit since we're using useFactory
          azureProvider.onModuleInit();
          return azureProvider;
        }

        // Default to local storage
        const localProvider = new LocalStorageProvider(configService);
        // onModuleInit is async for local, but we need sync here
        // The provider will initialize itself on first use
        localProvider.onModuleInit().catch((err) => {
          console.error("Failed to initialize LocalStorageProvider:", err);
        });
        return localProvider;
      },
      inject: [ConfigService],
    },
    ModuleStorageService,
    DocumentProcessingService,
  ],
  controllers: [StorageController],
  exports: [ModuleStorageService, DocumentProcessingService, STORAGE_PROVIDER],
})
export class ModuleStorageModule {}

// =============================================================================
// ATTACHMENTS MODULE
// =============================================================================
//
// NestJS module for file attachments functionality. Provides file upload,
// storage, and retrieval for Cases, Investigations, and Investigation Notes.
//
// EXPORTS:
// - AttachmentsService: For use by other modules needing attachment operations
//
// FILE SIZE LIMITS:
// - Maximum file size: 50 MB (configured in Multer options)
// - Allowed types: Documents, images, audio/video, archives
// =============================================================================

import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

/**
 * Maximum file size allowed for uploads (50 MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Module({
  imports: [
    // Configure Multer for file uploads
    // Using memory storage since we upload to Azure Blob Storage
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Single file per request
      },
    }),
    // Note: PrismaModule, ActivityModule, and StorageModule are @Global()
    // so they don't need to be imported here
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService], // Export for use by other modules
})
export class AttachmentsModule {}

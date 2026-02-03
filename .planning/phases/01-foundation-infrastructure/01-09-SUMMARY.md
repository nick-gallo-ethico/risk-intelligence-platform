---
phase: 01-foundation-infrastructure
plan: 09
subsystem: storage
tags: [azure-blob, file-storage, document-processing, tenant-isolation, attachments]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventsModule for file.uploaded events
  - phase: 01-02
    provides: JobsModule dependency (referenced in plan)
provides:
  - ModuleStorageService for file uploads with Attachment tracking
  - DocumentProcessingService for text extraction (search indexing)
  - StorageController REST API at /api/v1/storage
  - StorageProvider abstraction (Azure Blob and Local)
  - Per-tenant container isolation (org-{uuid})
  - Signed URL generation for secure downloads
affects: [search-indexing, case-attachments, investigation-attachments, document-search]

# Tech tracking
tech-stack:
  added: ["@azure/storage-blob", "@azure/identity"]
  patterns: [provider-abstraction, per-tenant-isolation, signed-urls, document-extraction]

key-files:
  created:
    - apps/backend/src/modules/storage/storage.module.ts
    - apps/backend/src/modules/storage/storage.service.ts
    - apps/backend/src/modules/storage/storage.controller.ts
    - apps/backend/src/modules/storage/document-processing.service.ts
    - apps/backend/src/modules/storage/dto/upload-response.dto.ts
    - apps/backend/src/modules/storage/providers/storage-provider.interface.ts
    - apps/backend/src/modules/storage/providers/azure-blob.provider.ts
    - apps/backend/src/modules/storage/providers/local-storage.provider.ts
  modified:
    - apps/backend/src/app.module.ts
    - apps/backend/src/config/configuration.ts
    - apps/backend/package.json

key-decisions:
  - "Two storage modules coexist: common/StorageModule (low-level) and modules/storage/ModuleStorageModule (high-level with Attachment tracking)"
  - "ModuleStorageService creates Attachment records automatically on upload"
  - "DocumentProcessingService uses placeholder for PDF/Office extraction - text/* files work now"
  - "Per-tenant containers named {prefix}-org-{organizationId} for Azure, org-{organizationId} directories for local"
  - "Signed URLs default to 15-minute expiration"

patterns-established:
  - "Provider abstraction: STORAGE_PROVIDER injection token with useFactory for env-based selection"
  - "Per-tenant isolation: organizationId in all storage operations, container/directory naming convention"
  - "Event emission: file.uploaded event for search indexing integration"
  - "Metadata sidecar files: .meta.json for local storage"

# Metrics
duration: 6min
completed: 2026-02-03
---

# Phase 01 Plan 09: File Storage Service Summary

**Azure Blob Storage with provider abstraction, per-tenant container isolation, Attachment tracking, and document text extraction for search indexing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-03T01:52:19Z
- **Completed:** 2026-02-03T01:58:23Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- StorageProvider interface with Azure Blob and Local filesystem implementations
- ModuleStorageService with automatic Attachment record creation and event emission
- DocumentProcessingService for extracting text from documents (supports text/* types, placeholder for PDF/Office)
- StorageController with REST endpoints for upload, download URL, metadata, and deletion
- Per-tenant container isolation: org-{uuid} naming convention
- Signed URLs with configurable expiration for secure downloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Azure Storage SDK and create provider interface** - `94e9c3d` (feat)
2. **Task 2: Create Azure Blob and Local storage providers** - `958f985` (feat)
3. **Task 3: Create StorageService, DocumentProcessing, and controller** - `888fba8` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/src/modules/storage/storage.module.ts` - ModuleStorageModule with provider factory
- `apps/backend/src/modules/storage/storage.service.ts` - ModuleStorageService with Attachment integration
- `apps/backend/src/modules/storage/storage.controller.ts` - REST API for storage operations
- `apps/backend/src/modules/storage/document-processing.service.ts` - Text extraction service
- `apps/backend/src/modules/storage/dto/upload-response.dto.ts` - Response DTOs
- `apps/backend/src/modules/storage/providers/storage-provider.interface.ts` - Provider contract
- `apps/backend/src/modules/storage/providers/azure-blob.provider.ts` - Azure implementation
- `apps/backend/src/modules/storage/providers/local-storage.provider.ts` - Local filesystem implementation
- `apps/backend/src/modules/storage/providers/index.ts` - Barrel export for providers
- `apps/backend/src/modules/storage/index.ts` - Barrel export for module

**Modified:**
- `apps/backend/src/app.module.ts` - Added ModuleStorageModule import
- `apps/backend/src/config/configuration.ts` - Azure Storage configuration (already present)
- `apps/backend/package.json` - Added @azure/storage-blob and @azure/identity

## Decisions Made

1. **Two storage modules coexist:** The existing `common/StorageModule` provides low-level storage with validation (used by AttachmentsModule). The new `modules/storage/ModuleStorageModule` provides high-level storage with automatic Attachment record creation and event emission. This avoids breaking existing code while adding new capabilities.

2. **ModuleStorageService naming:** Named the service `ModuleStorageService` to avoid collision with existing `StorageService` in common/services.

3. **Document processing placeholder:** Text extraction for PDF, DOCX, and other binary formats is a placeholder. Full implementation will require pdf-parse, mammoth, and other libraries. Plain text files (text/*) work immediately.

4. **Container naming convention:** Azure containers use `{prefix}-org-{organizationId}` format. The prefix defaults to "ethico" and is configurable. Container names are sanitized to meet Azure requirements (lowercase, alphanumeric, hyphens).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for development (uses local storage by default).

For production Azure Blob Storage:
- Set `STORAGE_PROVIDER=azure`
- Set `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY`
- Optionally set `AZURE_STORAGE_CONTAINER_PREFIX` (default: "ethico")

## Next Phase Readiness

- Storage infrastructure complete and ready for file attachments across all modules
- Document text extraction ready for search indexing integration
- AttachmentsModule can continue using common/StorageModule
- New modules can use ModuleStorageService for automatic Attachment tracking
- Event emission (`file.uploaded`) ready for search indexing pipeline

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*

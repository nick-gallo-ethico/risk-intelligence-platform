---
phase: 33-slop-cleanup-production-readiness
plan: 02
subsystem: storage
tags:
  [
    pdf-parse,
    mammoth,
    file-type,
    document-extraction,
    magic-bytes,
    file-validation,
    security,
  ]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure
    provides: Storage service infrastructure
provides:
  - Real PDF text extraction using pdf-parse
  - Real DOCX text extraction using mammoth
  - Magic byte file validation using file-type
  - Dangerous extension blocking
  - MIME spoofing prevention
affects: [search-indexing, file-upload, attachments, security-audit]

# Tech tracking
tech-stack:
  added: [pdf-parse@1.1.1, mammoth@1.11.0, file-type@20.4.1]
  patterns: [dynamic ESM import in CommonJS, dual-layer file validation]

key-files:
  created: []
  modified:
    - apps/backend/package.json
    - apps/backend/src/modules/storage/document-processing.service.ts
    - apps/backend/src/common/services/storage.service.ts
    - apps/backend/src/modules/storage/storage.service.ts

key-decisions:
  - "Downgraded pdf-parse to v1.1.1 for CommonJS compatibility (v2.x is ESM-only with different API)"
  - "Use dynamic import for file-type ESM package in CommonJS context"
  - "Dual validation: extension blocklist + magic byte verification"
  - "Text-based extensions (.txt, .csv, .json, etc.) bypass magic byte check since they have no magic bytes"

patterns-established:
  - "Dynamic ESM import: await import('file-type') for ESM packages in CommonJS"
  - "DANGEROUS_EXTENSIONS and ALLOWED_EXTENSIONS exported constants for consistent filtering"
  - "Magic byte validation returns { valid, detectedMime?, error? } for detailed feedback"

# Metrics
duration: 16min
completed: 2026-02-16
---

# Phase 33 Plan 02: Document Processing & File Validation Summary

**Real PDF/DOCX text extraction with pdf-parse/mammoth and magic-byte file validation using file-type to prevent MIME spoofing**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-16T00:22:15Z
- **Completed:** 2026-02-16T00:37:55Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- PDF documents now extract real text using pdf-parse library for search indexing
- DOCX documents now extract real text using mammoth library for search indexing
- File uploads validated against magic bytes to prevent MIME type spoofing attacks
- Dangerous file extensions (.exe, .bat, .ps1, etc.) blocked at upload
- Both common StorageService and module ModuleStorageService secured

## Task Commits

Each task was committed atomically:

1. **Task 1: Install document processing and file validation packages** - `404a731` (feat)
2. **Task 2: Implement PDF and DOCX text extraction** - `a8f8cb9` (feat)
3. **Task 3: Add magic-byte file validation** - `6928d66` (feat)

## Files Created/Modified

- `apps/backend/package.json` - Added pdf-parse, mammoth, file-type dependencies
- `apps/backend/src/modules/storage/document-processing.service.ts` - Real PDF/DOCX extraction
- `apps/backend/src/common/services/storage.service.ts` - Magic byte validation and extension filtering
- `apps/backend/src/modules/storage/storage.service.ts` - Magic byte validation for module-level uploads

## Decisions Made

- **pdf-parse v1.1.1:** Downgraded from v2.4.5 because v2.x is ESM-only with a completely different class-based API. v1.1.1 has the simple `pdfParse(buffer)` function that works directly in CommonJS.
- **Dynamic import for file-type:** file-type v20.x is ESM-only, so we use `await import('file-type')` inside async methods to load it dynamically in the CommonJS NestJS backend.
- **Text files bypass magic bytes:** Plain text files (.txt, .csv, .json, .xml, .md, .html) have no magic bytes, so they're allowed through if the extension matches the text-based allowlist.
- **Dual validation approach:** Both extension blocking (first line of defense) and magic byte verification (prevent spoofing) are applied for defense in depth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pdf-parse v2.x incompatible with CommonJS**

- **Found during:** Task 2 (PDF extraction implementation)
- **Issue:** pdf-parse@2.4.5 is ESM-only with a class-based API (`new PDFParse()`) that doesn't work in NestJS CommonJS environment
- **Fix:** Downgraded to pdf-parse@1.1.1 which has the simple `pdfParse(buffer)` function
- **Files modified:** apps/backend/package.json
- **Verification:** TypeScript compiles, import works correctly
- **Committed in:** a8f8cb9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Version downgrade necessary for compatibility. No functional impact - both versions provide PDF text extraction.

## Issues Encountered

- ESLint auto-added `@typescript-eslint/no-require-imports` disable comment for pdf-parse CommonJS require - expected behavior for CommonJS imports in TypeScript
- Buffer might be undefined in FileInput interface - added conditional check to only validate magic bytes when buffer is available

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Document processing now works for PDF and DOCX files
- File uploads are validated against spoofing attacks
- Ready for search indexing to use extracted text
- Ready for further security hardening in subsequent plans

---

_Phase: 33-slop-cleanup-production-readiness_
_Plan: 02_
_Completed: 2026-02-16_

# Ralph-Ready Tasks: Slice 1.8 - File Attachments & User Management

**Purpose:** Add file attachment support and user management to complete core case workflow.
**Slice Goal:** Upload/download files on cases/investigations, manage organization users.
**Reference:** [02-MODULES/05-CASE-MANAGEMENT/PRD.md](../02-MODULES/05-CASE-MANAGEMENT/PRD.md)

---

## Task Format Explanation

Each task follows this structure:
- **Prompt:** What to tell the AI
- **Input Files:** Files AI must read first
- **Output Files:** Files AI will create/modify
- **Verification:** Commands that must ALL pass
- **Stop Condition:** When to stop or ask for help
- **Dependencies:** What must be complete first

---

## Prerequisites

This slice assumes Slice 1.7 is complete:
- Case creation form working
- Full-text search working
- Dashboard with quick actions

---

## BACKEND TASKS

---

## Task 1.8.1: File Attachment Prisma Schema

**Estimate:** 1 hour

### Prompt for AI
```
Create Prisma schema for file attachments following:
- `apps/backend/examples/entity-pattern.prisma` - Entity patterns
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md` - Core data model

Create Attachment model with:
- id: UUID
- organizationId: UUID (tenant isolation)
- entityType: enum (CASE, INVESTIGATION, INVESTIGATION_NOTE)
- entityId: UUID (polymorphic reference)
- fileName: string (original filename)
- fileKey: string (storage key/path)
- mimeType: string
- fileSize: integer (bytes)
- uploadedById: UUID (FK to User)
- description: string? (optional)
- isEvidence: boolean (default false, for investigation files)
- createdAt, updatedAt: timestamps

Create AttachmentEntityType enum:
- CASE
- INVESTIGATION
- INVESTIGATION_NOTE

Add RLS policies for tenant isolation.

Index on (entityType, entityId) for efficient lookups.
Index on organizationId for RLS.
```

### Input Files (READ FIRST)
- `apps/backend/examples/entity-pattern.prisma`
- `apps/backend/prisma/schema.prisma`
- `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`

### Output Files
- Update `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/YYYYMMDD_add_attachment_entity/migration.sql`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npx prisma migrate dev --name add_attachment_entity
cd apps/backend && npx prisma generate
cd apps/backend && npm run typecheck
```

### Stop Condition
- Migration applies successfully
- Prisma client generated
- RLS policies in place
- OR document blockers

### Dependencies
- None (standalone)

---

## Task 1.8.2: File Storage Service

**Estimate:** 1.5 hours

### Prompt for AI
```
Create file storage service with local filesystem backend (Azure Blob ready).

Create StorageService in `apps/backend/src/common/services/`:

Interface:
- upload(file: Express.Multer.File, tenantId: string): Promise<{key: string, url: string}>
- download(key: string): Promise<{stream: Readable, mimeType: string}>
- delete(key: string): Promise<void>
- getSignedUrl(key: string, expiresIn?: number): Promise<string>

Implementation (LocalStorageAdapter for now):
- Store files in `./uploads/{tenantId}/{uuid}/{filename}`
- Generate unique keys using UUID
- Return relative paths as URLs for local dev
- Validate file types (configurable allowlist)
- Validate file size (configurable max, default 10MB)
- Sanitize filenames (remove special characters)

Configuration in config/configuration.ts:
- STORAGE_TYPE: 'local' | 'azure' (default 'local')
- STORAGE_PATH: './uploads' (for local)
- MAX_FILE_SIZE: 10485760 (10MB)
- ALLOWED_MIME_TYPES: ['image/*', 'application/pdf', 'text/*', ...]

Add to ConfigModule exports.

Note: Azure Blob adapter will be added later - design interface to support both.
```

### Input Files (READ FIRST)
- `apps/backend/src/config/configuration.ts`
- `apps/backend/src/common/services/` (existing services)
- `apps/backend/examples/service-pattern.ts`

### Output Files
- `apps/backend/src/common/services/storage.service.ts`
- `apps/backend/src/common/services/storage.interface.ts`
- `apps/backend/src/common/services/local-storage.adapter.ts`
- Update `apps/backend/src/config/configuration.ts`
- Update `apps/backend/src/common/index.ts`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

### Stop Condition
- StorageService injectable
- Local file upload/download works
- File validation works
- OR document blockers

### Dependencies
- None (standalone)

---

## Task 1.8.3: Attachment DTOs and Service

**Estimate:** 1.5 hours

### Prompt for AI
```
Create DTOs and service for file attachments.

DTOs in `apps/backend/src/modules/attachments/dto/`:

CreateAttachmentDto:
- entityType: AttachmentEntityType (required)
- entityId: UUID (required)
- description?: string (optional, max 500 chars)
- isEvidence?: boolean (optional, default false)
Note: File itself comes from multipart upload, not DTO

AttachmentResponseDto:
- id, organizationId, entityType, entityId
- fileName, mimeType, fileSize
- uploadedBy: { id, name, email }
- description, isEvidence
- downloadUrl: string (signed URL)
- createdAt

AttachmentQueryDto:
- entityType?: AttachmentEntityType
- entityId?: UUID
- isEvidence?: boolean
- page, limit (pagination)

Service in `apps/backend/src/modules/attachments/`:

AttachmentService methods:
- create(file: Express.Multer.File, dto: CreateAttachmentDto, userId: string, orgId: string)
  - Validate entity exists and belongs to org
  - Upload file via StorageService
  - Create attachment record
  - Log activity
- findByEntity(entityType: string, entityId: string, orgId: string)
- findOne(id: string, orgId: string)
- delete(id: string, userId: string, orgId: string)
  - Delete file from storage
  - Delete attachment record
  - Log activity

Entity validation:
- CASE: verify case exists in org
- INVESTIGATION: verify investigation exists in org
- INVESTIGATION_NOTE: verify note exists in org
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts`
- `apps/backend/examples/service-pattern.ts`
- `apps/backend/src/modules/cases/cases.service.ts`
- `apps/backend/src/common/services/storage.service.ts`

### Output Files
- `apps/backend/src/modules/attachments/dto/create-attachment.dto.ts`
- `apps/backend/src/modules/attachments/dto/attachment-response.dto.ts`
- `apps/backend/src/modules/attachments/dto/attachment-query.dto.ts`
- `apps/backend/src/modules/attachments/dto/index.ts`
- `apps/backend/src/modules/attachments/attachments.service.ts`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

### Stop Condition
- All DTOs with validation
- Service methods implemented
- Activity logging integrated
- OR document blockers

### Dependencies
- Task 1.8.1 (schema)
- Task 1.8.2 (storage service)

---

## Task 1.8.4: Attachment Controller & Module

**Estimate:** 1 hour

### Prompt for AI
```
Create controller and module for file attachments.

Controller endpoints:
- POST /api/v1/attachments - Upload file
  - Use @UseInterceptors(FileInterceptor('file'))
  - Body: CreateAttachmentDto
  - Returns: AttachmentResponseDto
- GET /api/v1/attachments?entityType=CASE&entityId=xxx - List by entity
- GET /api/v1/attachments/:id - Get single attachment
- GET /api/v1/attachments/:id/download - Download file (redirect to signed URL)
- DELETE /api/v1/attachments/:id - Delete attachment

Guards:
- JwtAuthGuard on all endpoints
- TenantGuard for tenant isolation
- RolesGuard: SYSTEM_ADMIN, COMPLIANCE_OFFICER, INVESTIGATOR can upload/delete

Swagger documentation:
- @ApiTags('attachments')
- @ApiConsumes('multipart/form-data') for upload
- @ApiBody with file schema
- Response types documented

Module:
- Import MulterModule with file size limits
- Export AttachmentService for use by other modules
- Register in AppModule
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts`
- `apps/backend/src/modules/cases/cases.controller.ts`
- `apps/backend/src/modules/attachments/attachments.service.ts`

### Output Files
- `apps/backend/src/modules/attachments/attachments.controller.ts`
- `apps/backend/src/modules/attachments/attachments.module.ts`
- Update `apps/backend/src/app.module.ts`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test

# Manual test: upload file
curl -X POST "http://localhost:3000/api/v1/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "entityType=CASE" \
  -F "entityId=xxx"
```

### Stop Condition
- All endpoints working
- File upload/download functional
- Swagger docs complete
- OR document blockers

### Dependencies
- Task 1.8.3 (service)

---

## Task 1.8.5: User Management DTOs and Service

**Estimate:** 1.5 hours

### Prompt for AI
```
Create DTOs and service for user management (admin only).

DTOs in `apps/backend/src/modules/users/dto/`:

CreateUserDto:
- email: string (required, email format)
- firstName: string (required)
- lastName: string (required)
- role: UserRole enum (required)
- password?: string (optional, for local auth)
- departmentId?: UUID
- businessUnitId?: UUID

UpdateUserDto:
- firstName?: string
- lastName?: string
- role?: UserRole
- isActive?: boolean
- departmentId?: UUID
- businessUnitId?: UUID

UserResponseDto:
- id, email, firstName, lastName
- role, isActive
- department?: { id, name }
- businessUnit?: { id, name }
- lastLoginAt
- createdAt, updatedAt

UserQueryDto:
- role?: UserRole
- isActive?: boolean
- search?: string (name or email)
- page, limit

Service in `apps/backend/src/modules/users/`:

UsersService methods:
- create(dto: CreateUserDto, creatorId: string, orgId: string)
  - Hash password if provided
  - Send welcome email (stub for now)
  - Log activity
- findAll(query: UserQueryDto, orgId: string)
- findOne(id: string, orgId: string)
- update(id: string, dto: UpdateUserDto, updaterId: string, orgId: string)
  - Cannot deactivate self
  - Log activity
- deactivate(id: string, updaterId: string, orgId: string)
  - Soft delete (isActive = false)
  - Cannot deactivate self
  - Log activity

Note: Password reset and SSO linking are separate features for later.
```

### Input Files (READ FIRST)
- `apps/backend/examples/dto-pattern.ts`
- `apps/backend/examples/service-pattern.ts`
- `apps/backend/prisma/schema.prisma` (User model)
- `apps/backend/src/modules/auth/auth.service.ts` (password hashing)

### Output Files
- `apps/backend/src/modules/users/dto/create-user.dto.ts`
- `apps/backend/src/modules/users/dto/update-user.dto.ts`
- `apps/backend/src/modules/users/dto/user-response.dto.ts`
- `apps/backend/src/modules/users/dto/user-query.dto.ts`
- `apps/backend/src/modules/users/dto/index.ts`
- `apps/backend/src/modules/users/users.service.ts`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
```

### Stop Condition
- All DTOs with validation
- Service methods implemented
- Password hashing working
- Activity logging integrated
- OR document blockers

### Dependencies
- None (User model exists)

---

## Task 1.8.6: User Management Controller & Module

**Estimate:** 1 hour

### Prompt for AI
```
Create controller and module for user management.

Controller endpoints:
- POST /api/v1/users - Create user (SYSTEM_ADMIN only)
- GET /api/v1/users - List users with filters
- GET /api/v1/users/:id - Get user details
- PATCH /api/v1/users/:id - Update user (SYSTEM_ADMIN only)
- DELETE /api/v1/users/:id - Deactivate user (SYSTEM_ADMIN only)
- GET /api/v1/users/me - Get current user profile (any authenticated)

Guards:
- JwtAuthGuard on all endpoints
- TenantGuard for tenant isolation
- RolesGuard: SYSTEM_ADMIN for create/update/delete

Swagger documentation:
- @ApiTags('users')
- All request/response types documented
- Role requirements documented

Module:
- Export UsersService for use by other modules
- Register in AppModule
```

### Input Files (READ FIRST)
- `apps/backend/examples/controller-pattern.ts`
- `apps/backend/src/modules/cases/cases.controller.ts`
- `apps/backend/src/modules/users/users.service.ts`

### Output Files
- `apps/backend/src/modules/users/users.controller.ts`
- `apps/backend/src/modules/users/users.module.ts`
- Update `apps/backend/src/app.module.ts`

### Verification (ALL MUST PASS)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test

# Manual test: list users
curl "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer $TOKEN"
```

### Stop Condition
- All endpoints working
- Role enforcement working
- Swagger docs complete
- OR document blockers

### Dependencies
- Task 1.8.5 (service)

---

## FRONTEND TASKS

---

## Task 1.8.7: File Upload Component

**Estimate:** 1.5 hours

### Prompt for AI
```
Create reusable file upload component for case/investigation attachments.

Component: `apps/frontend/src/components/files/file-upload.tsx`

Features:
- Drag and drop zone
- Click to browse files
- Multiple file selection
- File type validation (show allowed types)
- File size validation (show max size)
- Upload progress indicator
- Preview for images
- Remove file before upload
- Error display per file

Props:
- entityType: 'CASE' | 'INVESTIGATION' | 'INVESTIGATION_NOTE'
- entityId: string
- onUploadComplete?: (attachment: Attachment) => void
- maxFiles?: number (default 10)
- accept?: string (mime types)
- maxSize?: number (bytes, default 10MB)

API integration:
- POST /api/v1/attachments with multipart/form-data
- Handle upload errors
- Show success toast

Use shadcn/ui components:
- Card for drop zone
- Progress for upload
- Button for actions
- Badge for file type

Add to case detail page:
- Attachments section in properties panel
- List existing attachments
- Upload button
```

### Input Files (READ FIRST)
- `apps/frontend/src/components/ui/` (shadcn components)
- `apps/frontend/src/lib/api.ts`
- `apps/frontend/src/app/cases/[id]/page.tsx`

### Output Files
- `apps/frontend/src/components/files/file-upload.tsx`
- `apps/frontend/src/components/files/file-list.tsx`
- `apps/frontend/src/components/files/file-preview.tsx`
- `apps/frontend/src/lib/attachments-api.ts`
- Update `apps/frontend/src/app/cases/[id]/page.tsx`

### Verification (ALL MUST PASS)
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

Manual verification:
1. Navigate to case detail
2. Upload file via drag and drop
3. Upload file via click
4. Verify file appears in list
5. Download file
6. Delete file

### Stop Condition
- File upload working
- File list displays
- Download works
- Delete works
- OR document blockers

### Dependencies
- Task 1.8.4 (backend endpoints)

---

## Task 1.8.8: User Management UI

**Estimate:** 2 hours

### Prompt for AI
```
Create user management page for admins.

Page: `apps/frontend/src/app/settings/users/page.tsx`

Features:
1. User list table:
   - Columns: Name, Email, Role, Status, Last Login, Actions
   - Sortable by name, email, last login
   - Filterable by role, status
   - Search by name or email
   - Pagination

2. Create user dialog:
   - Form with validation
   - Role selection dropdown
   - Optional password (or generate invite link)
   - Success toast with next steps

3. Edit user dialog:
   - Pre-filled form
   - Cannot edit own role
   - Cannot deactivate self
   - Success toast

4. Deactivate confirmation:
   - Confirm dialog
   - Warning about access removal
   - Success toast

5. User detail view (optional):
   - Click row to see full details
   - Activity history for user

Navigation:
- Add "Settings" section to sidebar
- Add "Users" link under Settings
- Visible only to SYSTEM_ADMIN role

Components:
- UsersTable
- CreateUserDialog
- EditUserDialog
- UserFilters
```

### Input Files (READ FIRST)
- `apps/frontend/src/app/cases/page.tsx` (table patterns)
- `apps/frontend/src/components/ui/`
- `apps/backend/src/modules/users/dto/` (DTO shapes)

### Output Files
- `apps/frontend/src/app/settings/users/page.tsx`
- `apps/frontend/src/components/users/users-table.tsx`
- `apps/frontend/src/components/users/create-user-dialog.tsx`
- `apps/frontend/src/components/users/edit-user-dialog.tsx`
- `apps/frontend/src/components/users/user-filters.tsx`
- `apps/frontend/src/lib/users-api.ts`
- Update sidebar navigation

### Verification (ALL MUST PASS)
```bash
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
```

Manual verification:
1. Login as admin
2. Navigate to Settings > Users
3. Create new user
4. Edit user
5. Deactivate user
6. Verify non-admin cannot access

### Stop Condition
- User list displays
- CRUD operations work
- Role restrictions enforced
- OR document blockers

### Dependencies
- Task 1.8.6 (backend endpoints)

---

## Task 1.8.9: E2E Tests for Slice 1.8

**Estimate:** 1.5 hours

### Prompt for AI
```
Add E2E tests for file attachments and user management.

Test scenarios:

1. File Attachments:
   - Upload file to case
   - Verify file appears in attachments list
   - Download file
   - Delete file
   - Upload to investigation
   - Test file type validation
   - Test file size validation

2. User Management (admin only):
   - Navigate to users page
   - Create new user
   - Verify user appears in list
   - Edit user role
   - Deactivate user
   - Verify deactivated user cannot login
   - Test non-admin cannot access users page

3. Permission tests:
   - Investigator can upload files
   - Employee cannot upload files
   - Only admin can manage users

Add to existing Playwright test structure.
```

### Input Files (READ FIRST)
- `apps/frontend/e2e/tests/` (existing tests)
- `apps/frontend/e2e/pages/` (page objects)

### Output Files
- `apps/frontend/e2e/tests/attachments.spec.ts`
- `apps/frontend/e2e/tests/user-management.spec.ts`
- `apps/frontend/e2e/pages/users.page.ts`
- Update `apps/frontend/e2e/pages/case-detail.page.ts` (add attachment methods)

### Verification (ALL MUST PASS)
```bash
cd apps/frontend && npm run e2e
```

### Stop Condition
- All E2E tests pass
- File upload tested
- User management tested
- OR document blockers

### Dependencies
- Tasks 1.8.7, 1.8.8 (UI complete)

---

## Task Dependency Graph

```
BACKEND:

Task 1.8.1 (Attachment Schema)
     │
     v
Task 1.8.2 (Storage Service) ──────┐
     │                             │
     v                             v
Task 1.8.3 (Attachment DTOs/Service)
     │
     v
Task 1.8.4 (Attachment Controller)


Task 1.8.5 (User DTOs/Service)
     │
     v
Task 1.8.6 (User Controller)


FRONTEND:

Task 1.8.4 ────────────────────► Task 1.8.7 (File Upload UI)

Task 1.8.6 ────────────────────► Task 1.8.8 (User Management UI)


E2E TESTING:

Tasks 1.8.7, 1.8.8 ────────────► Task 1.8.9 (E2E Tests)
```

---

## Parallel Execution Opportunities

**Phase 1 (can run in parallel):**
- Backend attachments: 1.8.1 → 1.8.2 → 1.8.3 → 1.8.4
- Backend users: 1.8.5 → 1.8.6

**Phase 2 (after Phase 1):**
- Frontend: 1.8.7 (needs 1.8.4)
- Frontend: 1.8.8 (needs 1.8.6)

**Phase 3 (after all):**
- 1.8.9 (E2E Tests)

---

## Success Criteria for Slice 1.8

### File Attachments
- [ ] Attachment entity with RLS
- [ ] Local file storage working
- [ ] Upload/download/delete endpoints
- [ ] File type and size validation
- [ ] Attachments on case detail page
- [ ] Drag and drop upload UI

### User Management
- [ ] User CRUD endpoints (admin only)
- [ ] User list page with filters
- [ ] Create/edit/deactivate dialogs
- [ ] Role-based access enforced
- [ ] Settings navigation added

### Testing
- [ ] E2E tests for attachments
- [ ] E2E tests for user management
- [ ] Permission tests pass
- [ ] All existing tests still pass

### Verification Commands (All Must Pass)
```bash
cd apps/backend && npm run typecheck
cd apps/backend && npm run lint
cd apps/backend && npm test
cd apps/backend && npm run test:e2e
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run lint
cd apps/frontend && npm run e2e
```

---

*End of Ralph-Ready Tasks for Slice 1.8*

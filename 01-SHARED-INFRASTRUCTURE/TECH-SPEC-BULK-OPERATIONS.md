# Technical Specification: Bulk Operations

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All modules supporting multi-entity operations

**Key Consumers:**
- Case Management: Bulk assign, close, update status
- Investigation Management: Bulk reassign, status updates
- Policy Management: Bulk publish, archive, assign
- Disclosures: Bulk approve, request changes
- RIU Management: Bulk release, categorize
- User Management: Bulk role assignment, deactivation
- Campaign Management: Bulk send notifications, reminders

---

## Table of Contents

1. [Overview](#1-overview)
2. [Bulk Operation Types](#2-bulk-operation-types)
3. [Selection Modes](#3-selection-modes)
4. [Data Model](#4-data-model)
5. [Preview Pattern](#5-preview-pattern)
6. [Execution Flow](#6-execution-flow)
7. [Async Job Processing](#7-async-job-processing)
8. [API Specifications](#8-api-specifications)
9. [Permission Model](#9-permission-model)
10. [AI Integration](#10-ai-integration)
11. [Rate Limiting](#11-rate-limiting)
12. [Undo Support](#12-undo-support)
13. [Audit Trail](#13-audit-trail)
14. [UI Specifications](#14-ui-specifications)
15. [Security Considerations](#15-security-considerations)
16. [Implementation Guide](#16-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document specifies a unified bulk operations system that enables users to perform actions on multiple entities simultaneously. Rather than implementing separate bulk systems per module, a single reusable engine provides consistency, safety guardrails, and comprehensive audit trails across the platform.

### 1.2 Scope

- Visual selection and query-based entity selection
- Preview before execution with impact analysis
- Synchronous execution for small batches
- Asynchronous job processing for large batches
- Progress tracking and notification on completion
- Full audit trail with cross-reference
- Undo support for reversible operations
- AI-assisted bulk operations with mandatory human confirmation

### 1.3 Key Design Principles

1. **Safety First**: Tiered confirmation based on impact (per WORKING-DECISIONS V.4)
2. **Preview Required**: Users see exactly what will change before execution
3. **Tenant Isolated**: All bulk operations scoped by `organization_id`
4. **Fully Auditable**: Every affected entity linked to bulk operation record
5. **Permission Enforced**: Users can only operate on entities they have write access to
6. **Async When Needed**: Large batches run as background jobs with progress tracking

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15+ | Operation state, audit trail |
| Queue | BullMQ (Redis) | Async job processing |
| Cache | Redis 7 | Operation locks, progress tracking |
| Events | Socket.io | Real-time progress updates |
| Scheduling | node-cron | Cleanup of expired previews |

---

## 2. Bulk Operation Types

### 2.1 Supported Operations Matrix

| Operation | Entities | Max Items (Visual) | Max Items (Query) | Confirmation Level |
|-----------|----------|-------------------|-------------------|-------------------|
| Assign | Cases, Investigations | 100 | 10,000 | Preview + Confirm |
| Reassign | Cases, Investigations | 100 | 10,000 | Preview + Confirm |
| Status Change | Cases, Investigations, RIUs | 100 | 10,000 | Preview + Confirm |
| Field Update | Any with custom fields | 100 | 5,000 | Preview + Confirm |
| Category Change | Cases, RIUs | 100 | 5,000 | Preview + Confirm |
| Priority Change | Cases, Investigations | 100 | 10,000 | Preview + Confirm |
| Export | Any | N/A | 50,000 | Background job |
| Archive | Cases, Policies, Disclosures | 50 | 1,000 | Explicit confirm + reason |
| Delete (Soft) | Cases, Policies | 50 | 500 | Explicit confirm + reason |
| Send Notification | Users, Employees | 500 | 10,000 | Preview all + Confirm |
| Release | RIUs | 100 | 5,000 | Preview + Confirm |
| Publish | Policies | 50 | 500 | Preview + Confirm |
| Approve | Disclosures, Workflows | 100 | 1,000 | Preview + Confirm |
| Add Tag | Any with tags | 100 | 10,000 | Preview + Confirm |
| Remove Tag | Any with tags | 100 | 10,000 | Preview + Confirm |

### 2.2 Operation Type Definitions

```typescript
// apps/backend/src/modules/bulk/enums/bulk-operation-type.enum.ts

export enum BulkOperationType {
  // Assignment operations
  ASSIGN = 'ASSIGN',
  REASSIGN = 'REASSIGN',

  // Status operations
  STATUS_CHANGE = 'STATUS_CHANGE',
  CLOSE = 'CLOSE',
  REOPEN = 'REOPEN',
  ARCHIVE = 'ARCHIVE',
  DELETE = 'DELETE',

  // Field operations
  FIELD_UPDATE = 'FIELD_UPDATE',
  CATEGORY_CHANGE = 'CATEGORY_CHANGE',
  PRIORITY_CHANGE = 'PRIORITY_CHANGE',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',

  // Workflow operations
  RELEASE = 'RELEASE',
  PUBLISH = 'PUBLISH',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',

  // Communication operations
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  SEND_REMINDER = 'SEND_REMINDER',

  // Export operations
  EXPORT = 'EXPORT',
}

export enum BulkEntityType {
  CASE = 'CASE',
  INVESTIGATION = 'INVESTIGATION',
  RIU = 'RIU',
  POLICY = 'POLICY',
  DISCLOSURE = 'DISCLOSURE',
  USER = 'USER',
  EMPLOYEE = 'EMPLOYEE',
  CAMPAIGN_ASSIGNMENT = 'CAMPAIGN_ASSIGNMENT',
}
```

### 2.3 Operation Risk Classification

```typescript
// apps/backend/src/modules/bulk/enums/risk-level.enum.ts

export enum BulkOperationRiskLevel {
  LOW = 'LOW',       // Tag changes, priority updates
  MEDIUM = 'MEDIUM', // Assignments, status changes
  HIGH = 'HIGH',     // Closures, notifications
  CRITICAL = 'CRITICAL', // Deletions, archives
}

export const OPERATION_RISK_LEVELS: Record<BulkOperationType, BulkOperationRiskLevel> = {
  [BulkOperationType.ADD_TAG]: BulkOperationRiskLevel.LOW,
  [BulkOperationType.REMOVE_TAG]: BulkOperationRiskLevel.LOW,
  [BulkOperationType.PRIORITY_CHANGE]: BulkOperationRiskLevel.LOW,
  [BulkOperationType.FIELD_UPDATE]: BulkOperationRiskLevel.LOW,

  [BulkOperationType.ASSIGN]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.REASSIGN]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.STATUS_CHANGE]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.CATEGORY_CHANGE]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.RELEASE]: BulkOperationRiskLevel.MEDIUM,

  [BulkOperationType.CLOSE]: BulkOperationRiskLevel.HIGH,
  [BulkOperationType.REOPEN]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.APPROVE]: BulkOperationRiskLevel.HIGH,
  [BulkOperationType.REJECT]: BulkOperationRiskLevel.HIGH,
  [BulkOperationType.PUBLISH]: BulkOperationRiskLevel.HIGH,
  [BulkOperationType.SEND_NOTIFICATION]: BulkOperationRiskLevel.HIGH,
  [BulkOperationType.SEND_REMINDER]: BulkOperationRiskLevel.MEDIUM,
  [BulkOperationType.EXPORT]: BulkOperationRiskLevel.MEDIUM,

  [BulkOperationType.ARCHIVE]: BulkOperationRiskLevel.CRITICAL,
  [BulkOperationType.DELETE]: BulkOperationRiskLevel.CRITICAL,
};
```

---

## 3. Selection Modes

### 3.1 Dual-Mode Approach

Per WORKING-DECISIONS V.1, bulk operations support two selection modes:

| Mode | Use Case | Max Items | Selection Persistence |
|------|----------|-----------|----------------------|
| Visual Selection | Small batches, ad-hoc operations | Up to 100 items | Session only |
| Query-Based | Large batches, recurring operations | Unlimited (evaluated at execution) | Can be saved as view |

### 3.2 Visual Selection Flow

```
1. User views entity list (e.g., Cases)
2. Checks checkboxes or uses "Select All on Page"
3. Bulk action menu appears with count
4. User selects operation
5. Preview shown → Confirm → Execute
```

```typescript
// apps/backend/src/modules/bulk/interfaces/visual-selection.interface.ts

export interface VisualSelection {
  /** Explicit list of entity IDs */
  entityIds: string[];

  /** Max 100 for visual selection */
  count: number;
}
```

### 3.3 Query-Based Selection Flow

```
1. User defines filter criteria or selects saved view
2. User initiates bulk action
3. System shows count + sample of affected entities
4. Preview shown → Type "CONFIRM" (for large batches) → Execute as async job
```

```typescript
// apps/backend/src/modules/bulk/interfaces/query-selection.interface.ts

export interface QuerySelection {
  /** Entity type being queried */
  entityType: BulkEntityType;

  /** Filter criteria (same format as list API filters) */
  filters: Record<string, any>;

  /** Optional: Reference to saved view */
  savedViewId?: string;

  /** Evaluated at preview time */
  estimatedCount?: number;
}
```

### 3.4 Selection Validation

```typescript
// apps/backend/src/modules/bulk/services/selection-validator.service.ts

@Injectable()
export class SelectionValidatorService {
  async validateSelection(
    selection: VisualSelection | QuerySelection,
    operationType: BulkOperationType,
    userId: string,
    organizationId: string,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check entity count limits
    const maxItems = this.getMaxItems(operationType, selection);
    const count = await this.getSelectionCount(selection, organizationId);

    if (count > maxItems) {
      errors.push({
        code: 'EXCEEDS_MAX_ITEMS',
        message: `Selection of ${count} items exceeds maximum of ${maxItems} for ${operationType}`,
      });
    }

    // Verify user has permission on all selected entities
    const accessibleIds = await this.filterByPermission(
      selection,
      userId,
      organizationId,
    );

    const inaccessibleCount = count - accessibleIds.length;
    if (inaccessibleCount > 0) {
      warnings.push({
        code: 'PARTIAL_ACCESS',
        message: `${inaccessibleCount} items will be skipped (no write access)`,
        affectedCount: inaccessibleCount,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      accessibleCount: accessibleIds.length,
      totalCount: count,
    };
  }
}
```

---

## 4. Data Model

### 4.1 Core Entities

```prisma
// apps/backend/prisma/schema.prisma

model BulkOperation {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Operation definition
  operationType     String   // BulkOperationType enum
  entityType        String   // BulkEntityType enum
  selectionMode     String   // 'VISUAL' | 'QUERY'

  // Selection (one of these is populated)
  entityIds         String[] // Visual selection
  queryFilters      Json?    // Query-based selection
  savedViewId       String?  // Reference to saved view

  // Changes to apply
  changes           Json     // Operation-specific payload

  // Execution state
  status            String   // BulkOperationStatus enum

  // Counts
  totalItems        Int
  processedItems    Int      @default(0)
  successCount      Int      @default(0)
  failureCount      Int      @default(0)
  skippedCount      Int      @default(0)

  // Async job tracking
  jobId             String?  @unique
  progress          Float?   // 0.0 to 1.0

  // Timing
  previewedAt       DateTime?
  previewExpiresAt  DateTime?
  confirmedAt       DateTime?
  startedAt         DateTime?
  completedAt       DateTime?

  // Audit
  createdById       String
  createdBy         User     @relation("BulkOperationCreatedBy", fields: [createdById], references: [id])
  confirmedById     String?
  confirmedBy       User?    @relation("BulkOperationConfirmedBy", fields: [confirmedById], references: [id])

  // Optional undo
  undoAvailable     Boolean  @default(false)
  undoExpiresAt     DateTime?
  undoneAt          DateTime?
  undoneById        String?
  undoneBy          User?    @relation("BulkOperationUndoneBy", fields: [undoneById], references: [id])

  // Metadata
  reason            String?  // Required for destructive operations

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  items             BulkOperationItem[]

  @@index([organizationId])
  @@index([status])
  @@index([createdById])
  @@index([jobId])
}

model BulkOperationItem {
  id                String   @id @default(uuid())
  bulkOperationId   String
  bulkOperation     BulkOperation @relation(fields: [bulkOperationId], references: [id], onDelete: Cascade)

  // Target entity
  entityType        String
  entityId          String

  // Execution result
  status            String   // 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  errorCode         String?
  errorMessage      String?

  // For undo support
  previousValue     Json?    // State before change
  newValue          Json?    // State after change

  processedAt       DateTime?

  @@index([bulkOperationId])
  @@index([entityId])
  @@index([status])
}
```

### 4.2 Status Enumeration

```typescript
// apps/backend/src/modules/bulk/enums/bulk-operation-status.enum.ts

export enum BulkOperationStatus {
  /** Initial state, preview not yet generated */
  DRAFT = 'DRAFT',

  /** Preview generated, awaiting confirmation */
  PREVIEWING = 'PREVIEWING',

  /** Preview expired, must regenerate */
  PREVIEW_EXPIRED = 'PREVIEW_EXPIRED',

  /** Confirmed by user, queued for execution */
  CONFIRMED = 'CONFIRMED',

  /** Currently executing */
  PROCESSING = 'PROCESSING',

  /** All items processed successfully */
  COMPLETED = 'COMPLETED',

  /** Completed with some failures */
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',

  /** All items failed */
  FAILED = 'FAILED',

  /** Cancelled by user before completion */
  CANCELLED = 'CANCELLED',

  /** Operation was undone */
  UNDONE = 'UNDONE',
}
```

### 4.3 Operation Payload Examples

```typescript
// apps/backend/src/modules/bulk/interfaces/operation-payloads.interface.ts

/** Assign cases to a user */
interface AssignPayload {
  assigneeId: string;
  assigneeType: 'USER' | 'TEAM';
  comment?: string;
}

/** Change status of multiple entities */
interface StatusChangePayload {
  newStatus: string;
  reason?: string;
}

/** Update a custom field */
interface FieldUpdatePayload {
  fieldId: string;
  newValue: any;
}

/** Send notification */
interface SendNotificationPayload {
  templateId: string;
  subject: string;
  body: string;
  channels: ('IN_APP' | 'EMAIL' | 'SMS')[];
}

/** Export entities */
interface ExportPayload {
  format: 'CSV' | 'XLSX' | 'PDF';
  columns: string[];
  includeAttachments: boolean;
}

/** Archive entities */
interface ArchivePayload {
  reason: string; // Required
  retentionDays?: number;
}
```

---

## 5. Preview Pattern

### 5.1 Preview Requirements

Before execution, the system generates a preview showing:
- Total count of affected entities
- Sample of entities (first 10)
- Impact summary (what will change)
- Warnings (e.g., entities user cannot modify)
- Estimated execution time

### 5.2 Preview Response Structure

```typescript
// apps/backend/src/modules/bulk/interfaces/preview.interface.ts

export interface BulkOperationPreview {
  /** Reference to created bulk operation */
  operationId: string;

  /** Operation details */
  operationType: BulkOperationType;
  entityType: BulkEntityType;

  /** Counts */
  totalCount: number;
  accessibleCount: number;
  skippedCount: number;

  /** Sample of affected entities (max 10) */
  sample: PreviewItem[];

  /** Impact summary */
  impact: ImpactSummary;

  /** Warnings (non-blocking) */
  warnings: Warning[];

  /** Errors (blocking) */
  errors: Error[];

  /** Preview validity */
  previewExpiresAt: string; // ISO 8601

  /** Required confirmation level based on count and risk */
  confirmationLevel: 'CLICK' | 'PREVIEW' | 'TYPE_CONFIRM';

  /** Estimated execution time */
  estimatedDurationSeconds: number;

  /** Whether this will run as async job */
  isAsync: boolean;
}

export interface PreviewItem {
  entityId: string;
  entityType: string;
  displayName: string;
  currentValue: any;
  newValue: any;
  canModify: boolean;
  skipReason?: string;
}

export interface ImpactSummary {
  /** Human-readable summary */
  description: string;

  /** Breakdown by current state */
  byCurrentState?: Record<string, number>;

  /** Side effects */
  sideEffects?: string[];
}
```

### 5.3 Preview Generation Service

```typescript
// apps/backend/src/modules/bulk/services/preview.service.ts

@Injectable()
export class BulkPreviewService {
  constructor(
    private prisma: PrismaService,
    private selectionValidator: SelectionValidatorService,
    private permissionService: PermissionService,
  ) {}

  async generatePreview(
    dto: CreateBulkOperationDto,
    userId: string,
    organizationId: string,
  ): Promise<BulkOperationPreview> {
    // Validate selection
    const validation = await this.selectionValidator.validateSelection(
      dto.selection,
      dto.operationType,
      userId,
      organizationId,
    );

    if (!validation.valid) {
      throw new BulkOperationValidationError(validation.errors);
    }

    // Get affected entities
    const entities = await this.getAffectedEntities(
      dto.selection,
      organizationId,
    );

    // Filter by permission
    const accessibleEntities = await this.filterByPermission(
      entities,
      dto.operationType,
      userId,
      organizationId,
    );

    // Generate preview items (sample of 10)
    const sample = await this.generateSample(
      accessibleEntities.slice(0, 10),
      dto.operationType,
      dto.changes,
    );

    // Calculate impact
    const impact = await this.calculateImpact(
      accessibleEntities,
      dto.operationType,
      dto.changes,
    );

    // Create preview record
    const operation = await this.prisma.bulkOperation.create({
      data: {
        organizationId,
        operationType: dto.operationType,
        entityType: dto.entityType,
        selectionMode: dto.selection.entityIds ? 'VISUAL' : 'QUERY',
        entityIds: dto.selection.entityIds ?? [],
        queryFilters: dto.selection.filters ?? null,
        savedViewId: dto.selection.savedViewId,
        changes: dto.changes,
        status: BulkOperationStatus.PREVIEWING,
        totalItems: accessibleEntities.length,
        previewedAt: new Date(),
        previewExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        createdById: userId,
      },
    });

    // Determine confirmation level
    const confirmationLevel = this.getConfirmationLevel(
      accessibleEntities.length,
      dto.operationType,
    );

    return {
      operationId: operation.id,
      operationType: dto.operationType,
      entityType: dto.entityType,
      totalCount: entities.length,
      accessibleCount: accessibleEntities.length,
      skippedCount: entities.length - accessibleEntities.length,
      sample,
      impact,
      warnings: validation.warnings,
      errors: [],
      previewExpiresAt: operation.previewExpiresAt.toISOString(),
      confirmationLevel,
      estimatedDurationSeconds: this.estimateDuration(
        accessibleEntities.length,
        dto.operationType,
      ),
      isAsync: accessibleEntities.length > 100,
    };
  }

  /**
   * Per WORKING-DECISIONS V.4: Tiered confirmation by impact
   */
  private getConfirmationLevel(
    count: number,
    operationType: BulkOperationType,
  ): 'CLICK' | 'PREVIEW' | 'TYPE_CONFIRM' {
    const riskLevel = OPERATION_RISK_LEVELS[operationType];

    // Critical operations always require TYPE_CONFIRM
    if (riskLevel === BulkOperationRiskLevel.CRITICAL) {
      return 'TYPE_CONFIRM';
    }

    // Per V.4 thresholds
    if (count <= 10) return 'CLICK';
    if (count <= 100) return 'PREVIEW';
    return 'TYPE_CONFIRM'; // 1000+
  }
}
```

### 5.4 Preview Expiration

Previews expire after 30 minutes to ensure data hasn't changed:

```typescript
// apps/backend/src/modules/bulk/services/preview-cleanup.service.ts

@Injectable()
export class PreviewCleanupService {
  constructor(private prisma: PrismaService) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async cleanupExpiredPreviews() {
    await this.prisma.bulkOperation.updateMany({
      where: {
        status: BulkOperationStatus.PREVIEWING,
        previewExpiresAt: { lt: new Date() },
      },
      data: {
        status: BulkOperationStatus.PREVIEW_EXPIRED,
      },
    });
  }
}
```

---

## 6. Execution Flow

### 6.1 Synchronous Execution (Small Batches)

For operations with <= 100 items, execute synchronously:

```typescript
// apps/backend/src/modules/bulk/services/executor.service.ts

@Injectable()
export class BulkExecutorService {
  async executeSynchronous(
    operationId: string,
    userId: string,
  ): Promise<BulkOperationResult> {
    const operation = await this.loadAndValidate(operationId, userId);

    // Update status to processing
    await this.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: BulkOperationStatus.PROCESSING,
        confirmedById: userId,
        confirmedAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Get entities to process
    const entities = await this.getEntities(operation);

    // Process each entity
    const results: ItemResult[] = [];
    for (const entity of entities) {
      const result = await this.processEntity(
        operation,
        entity,
        userId,
      );
      results.push(result);
    }

    // Calculate final counts
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const failureCount = results.filter(r => r.status === 'FAILED').length;
    const skippedCount = results.filter(r => r.status === 'SKIPPED').length;

    // Determine final status
    const finalStatus = failureCount === 0
      ? BulkOperationStatus.COMPLETED
      : successCount === 0
        ? BulkOperationStatus.FAILED
        : BulkOperationStatus.COMPLETED_WITH_ERRORS;

    // Update operation record
    await this.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: finalStatus,
        processedItems: results.length,
        successCount,
        failureCount,
        skippedCount,
        completedAt: new Date(),
        undoAvailable: this.isUndoSupported(operation.operationType),
        undoExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Emit completion event
    this.eventEmitter.emit('bulk-operation.completed', {
      operationId,
      organizationId: operation.organizationId,
      status: finalStatus,
    });

    return {
      operationId,
      status: finalStatus,
      successCount,
      failureCount,
      skippedCount,
      failures: results.filter(r => r.status === 'FAILED'),
    };
  }

  private async processEntity(
    operation: BulkOperation,
    entity: any,
    userId: string,
  ): Promise<ItemResult> {
    try {
      // Capture previous state for undo
      const previousValue = this.captureState(entity, operation.operationType);

      // Execute the operation
      const newValue = await this.applyChange(
        entity,
        operation.operationType,
        operation.changes,
        userId,
      );

      // Record success
      await this.prisma.bulkOperationItem.create({
        data: {
          bulkOperationId: operation.id,
          entityType: operation.entityType,
          entityId: entity.id,
          status: 'SUCCESS',
          previousValue,
          newValue,
          processedAt: new Date(),
        },
      });

      // Log activity with bulk operation reference
      await this.activityService.log({
        entityType: operation.entityType,
        entityId: entity.id,
        action: operation.operationType.toLowerCase(),
        actionDescription: `${operation.operationType} via bulk operation [${operation.id}]`,
        actorUserId: userId,
        organizationId: operation.organizationId,
        metadata: { bulkOperationId: operation.id },
      });

      return { entityId: entity.id, status: 'SUCCESS' };
    } catch (error) {
      // Record failure
      await this.prisma.bulkOperationItem.create({
        data: {
          bulkOperationId: operation.id,
          entityType: operation.entityType,
          entityId: entity.id,
          status: 'FAILED',
          errorCode: error.code || 'UNKNOWN_ERROR',
          errorMessage: error.message,
          processedAt: new Date(),
        },
      });

      return {
        entityId: entity.id,
        status: 'FAILED',
        error: error.message,
      };
    }
  }
}
```

### 6.2 Operation-Specific Handlers

```typescript
// apps/backend/src/modules/bulk/handlers/assign.handler.ts

@Injectable()
export class BulkAssignHandler implements BulkOperationHandler {
  constructor(
    private caseService: CaseService,
    private investigationService: InvestigationService,
  ) {}

  async apply(
    entity: any,
    entityType: BulkEntityType,
    changes: AssignPayload,
    userId: string,
  ): Promise<any> {
    switch (entityType) {
      case BulkEntityType.CASE:
        return this.caseService.assign(
          entity.id,
          changes.assigneeId,
          changes.comment,
          userId,
        );
      case BulkEntityType.INVESTIGATION:
        return this.investigationService.assign(
          entity.id,
          changes.assigneeId,
          changes.comment,
          userId,
        );
      default:
        throw new Error(`Assign not supported for ${entityType}`);
    }
  }

  captureState(entity: any): any {
    return {
      assignedToId: entity.assignedToId,
      assignedToType: entity.assignedToType,
    };
  }
}
```

---

## 7. Async Job Processing

### 7.1 Job Queue Architecture

For operations with > 100 items, use BullMQ for background processing:

```typescript
// apps/backend/src/modules/bulk/processors/bulk-operation.processor.ts

@Processor('bulk-operations')
export class BulkOperationProcessor {
  constructor(
    private prisma: PrismaService,
    private executor: BulkExecutorService,
    private notificationService: NotificationService,
  ) {}

  @Process('execute-bulk-operation')
  async handleBulkOperation(job: Job<BulkOperationJobData>) {
    const { operationId, userId } = job.data;

    const operation = await this.prisma.bulkOperation.findUniqueOrThrow({
      where: { id: operationId },
    });

    // Update status
    await this.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: BulkOperationStatus.PROCESSING,
        startedAt: new Date(),
        jobId: job.id.toString(),
      },
    });

    // Get all entities
    const entities = await this.executor.getEntities(operation);
    const totalCount = entities.length;

    // Process in batches of 50
    const batchSize = 50;
    let processed = 0;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(entity =>
          this.executor.processEntity(operation, entity, userId)
        )
      );

      // Update counts
      successCount += results.filter(r => r.status === 'SUCCESS').length;
      failureCount += results.filter(r => r.status === 'FAILED').length;
      skippedCount += results.filter(r => r.status === 'SKIPPED').length;
      processed += batch.length;

      // Update progress
      const progress = processed / totalCount;
      await job.updateProgress(Math.round(progress * 100));

      await this.prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          processedItems: processed,
          successCount,
          failureCount,
          skippedCount,
          progress,
        },
      });

      // Emit progress event for real-time updates
      this.emitProgress(operation.organizationId, operationId, progress);
    }

    // Determine final status
    const finalStatus = failureCount === 0
      ? BulkOperationStatus.COMPLETED
      : successCount === 0
        ? BulkOperationStatus.FAILED
        : BulkOperationStatus.COMPLETED_WITH_ERRORS;

    // Finalize
    await this.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        undoAvailable: this.executor.isUndoSupported(operation.operationType),
        undoExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Notify user
    await this.notificationService.send({
      userId,
      type: 'BULK_OPERATION_COMPLETE',
      title: 'Bulk operation completed',
      body: `${operation.operationType} completed: ${successCount} succeeded, ${failureCount} failed`,
      data: { operationId, status: finalStatus },
    });

    return { operationId, status: finalStatus };
  }

  private emitProgress(
    organizationId: string,
    operationId: string,
    progress: number,
  ) {
    // Emit via Socket.io to subscribed clients
    this.socketGateway.server
      .to(`org:${organizationId}:bulk-operations`)
      .emit('bulk-operation:progress', {
        operationId,
        progress,
      });
  }
}
```

### 7.2 Job Queue Configuration

```typescript
// apps/backend/src/modules/bulk/bulk.module.ts

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'bulk-operations',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 1000,    // Keep last 1000 failed jobs
      },
    }),
  ],
  providers: [
    BulkOperationProcessor,
    BulkService,
    BulkPreviewService,
    BulkExecutorService,
    // ... handlers
  ],
})
export class BulkModule {}
```

### 7.3 Progress Tracking

```typescript
// apps/backend/src/modules/bulk/services/progress.service.ts

@Injectable()
export class BulkProgressService {
  constructor(
    private redis: RedisService,
    @InjectQueue('bulk-operations') private queue: Queue,
  ) {}

  async getProgress(operationId: string): Promise<ProgressInfo> {
    // Check if job is in queue
    const operation = await this.prisma.bulkOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new NotFoundException('Bulk operation not found');
    }

    // Get job progress if async
    if (operation.jobId) {
      const job = await this.queue.getJob(operation.jobId);
      if (job) {
        const progress = await job.progress();
        return {
          operationId,
          status: operation.status,
          progress: progress / 100,
          processedItems: operation.processedItems,
          totalItems: operation.totalItems,
          successCount: operation.successCount,
          failureCount: operation.failureCount,
          startedAt: operation.startedAt,
          estimatedCompletion: this.estimateCompletion(operation, progress),
        };
      }
    }

    return {
      operationId,
      status: operation.status,
      progress: operation.progress ?? 1,
      processedItems: operation.processedItems,
      totalItems: operation.totalItems,
      successCount: operation.successCount,
      failureCount: operation.failureCount,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
    };
  }
}
```

---

## 8. API Specifications

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/bulk/{entityType}/preview` | Generate preview of bulk operation |
| POST | `/api/v1/bulk/{entityType}/execute` | Confirm and execute bulk operation |
| GET | `/api/v1/bulk/operations` | List user's bulk operations |
| GET | `/api/v1/bulk/operations/{id}` | Get operation status and details |
| GET | `/api/v1/bulk/operations/{id}/items` | Get individual item results |
| POST | `/api/v1/bulk/operations/{id}/cancel` | Cancel pending operation |
| POST | `/api/v1/bulk/operations/{id}/undo` | Undo completed operation |

### 8.2 Preview Request

```typescript
// POST /api/v1/bulk/cases/preview

interface CreateBulkOperationDto {
  operationType: BulkOperationType;

  // Selection (one required)
  selection: {
    entityIds?: string[];      // Visual selection
    filters?: Record<string, any>;  // Query-based
    savedViewId?: string;      // From saved view
  };

  // Operation-specific payload
  changes: Record<string, any>;

  // Required for destructive operations
  reason?: string;
}

// Example: Assign 5 cases to a user
{
  "operationType": "ASSIGN",
  "selection": {
    "entityIds": ["case-1", "case-2", "case-3", "case-4", "case-5"]
  },
  "changes": {
    "assigneeId": "user-123",
    "assigneeType": "USER",
    "comment": "Reassigning for investigation"
  }
}

// Example: Archive all closed cases older than 1 year (query-based)
{
  "operationType": "ARCHIVE",
  "selection": {
    "filters": {
      "status": "CLOSED",
      "closedAt": { "lt": "2025-02-02T00:00:00Z" }
    }
  },
  "changes": {
    "retentionDays": 365
  },
  "reason": "Annual compliance archive per policy CP-2025-001"
}
```

### 8.3 Preview Response

```typescript
// 200 OK

{
  "operationId": "bulk-op-456",
  "operationType": "ASSIGN",
  "entityType": "CASE",
  "totalCount": 5,
  "accessibleCount": 5,
  "skippedCount": 0,
  "sample": [
    {
      "entityId": "case-1",
      "entityType": "CASE",
      "displayName": "Case #2024-001 - Harassment Complaint",
      "currentValue": { "assignedToId": "user-old", "assignedToName": "John Doe" },
      "newValue": { "assigneeId": "user-123", "assigneeName": "Jane Smith" },
      "canModify": true
    },
    // ... more items
  ],
  "impact": {
    "description": "5 cases will be reassigned from John Doe to Jane Smith",
    "byCurrentState": {
      "Open": 3,
      "In Progress": 2
    },
    "sideEffects": [
      "Assignees will receive notification",
      "Previous assignee will lose access (if not in team)"
    ]
  },
  "warnings": [],
  "errors": [],
  "previewExpiresAt": "2026-02-02T11:30:00Z",
  "confirmationLevel": "CLICK",
  "estimatedDurationSeconds": 2,
  "isAsync": false
}
```

### 8.4 Execute Request

```typescript
// POST /api/v1/bulk/cases/execute

interface ExecuteBulkOperationDto {
  operationId: string;

  // Required for TYPE_CONFIRM level
  confirmationText?: string;  // Must be "CONFIRM"
}

// Example
{
  "operationId": "bulk-op-456",
  "confirmationText": "CONFIRM"  // Required for large batches
}
```

### 8.5 Execute Response

```typescript
// Synchronous (small batch)
// 200 OK
{
  "operationId": "bulk-op-456",
  "status": "COMPLETED",
  "successCount": 5,
  "failureCount": 0,
  "skippedCount": 0,
  "failures": [],
  "undoAvailable": true,
  "undoExpiresAt": "2026-02-03T10:00:00Z"
}

// Asynchronous (large batch)
// 202 Accepted
{
  "operationId": "bulk-op-456",
  "status": "CONFIRMED",
  "message": "Operation queued for processing",
  "jobId": "job-789",
  "estimatedDurationSeconds": 120,
  "progressUrl": "/api/v1/bulk/operations/bulk-op-456"
}
```

### 8.6 Get Operation Status

```typescript
// GET /api/v1/bulk/operations/{id}

// 200 OK
{
  "id": "bulk-op-456",
  "operationType": "ASSIGN",
  "entityType": "CASE",
  "status": "PROCESSING",
  "totalItems": 500,
  "processedItems": 250,
  "successCount": 248,
  "failureCount": 2,
  "skippedCount": 0,
  "progress": 0.5,
  "startedAt": "2026-02-02T10:00:00Z",
  "estimatedCompletion": "2026-02-02T10:02:00Z",
  "createdBy": {
    "id": "user-123",
    "name": "Jane Smith"
  },
  "confirmedAt": "2026-02-02T10:00:00Z"
}
```

### 8.7 Cancel Operation

```typescript
// POST /api/v1/bulk/operations/{id}/cancel

// 200 OK
{
  "operationId": "bulk-op-456",
  "status": "CANCELLED",
  "processedBeforeCancel": 250,
  "message": "Operation cancelled. 250 items were already processed."
}
```

### 8.8 Controller Implementation

```typescript
// apps/backend/src/modules/bulk/bulk.controller.ts

@Controller('api/v1/bulk')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BulkController {
  constructor(private bulkService: BulkService) {}

  @Post(':entityType/preview')
  @ApiOperation({ summary: 'Generate preview of bulk operation' })
  @ApiResponse({ status: 200, type: BulkOperationPreviewDto })
  async createPreview(
    @Param('entityType') entityType: BulkEntityType,
    @Body() dto: CreateBulkOperationDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<BulkOperationPreviewDto> {
    return this.bulkService.createPreview(
      { ...dto, entityType },
      user.id,
      organizationId,
    );
  }

  @Post(':entityType/execute')
  @ApiOperation({ summary: 'Execute bulk operation' })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  @ApiResponse({ status: 202, description: 'Queued for async processing' })
  async execute(
    @Param('entityType') entityType: BulkEntityType,
    @Body() dto: ExecuteBulkOperationDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<BulkOperationResultDto> {
    return this.bulkService.execute(
      dto.operationId,
      dto.confirmationText,
      user.id,
      organizationId,
    );
  }

  @Get('operations')
  @ApiOperation({ summary: 'List bulk operations' })
  async list(
    @Query() query: ListBulkOperationsDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<PaginatedResponse<BulkOperationDto>> {
    return this.bulkService.list(query, user.id, organizationId);
  }

  @Get('operations/:id')
  @ApiOperation({ summary: 'Get bulk operation details' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<BulkOperationDto> {
    return this.bulkService.get(id, user.id, organizationId);
  }

  @Get('operations/:id/items')
  @ApiOperation({ summary: 'Get individual item results' })
  async getItems(
    @Param('id') id: string,
    @Query() query: ListItemsDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<PaginatedResponse<BulkOperationItemDto>> {
    return this.bulkService.getItems(id, query, user.id, organizationId);
  }

  @Post('operations/:id/cancel')
  @ApiOperation({ summary: 'Cancel pending operation' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<BulkOperationResultDto> {
    return this.bulkService.cancel(id, user.id, organizationId);
  }

  @Post('operations/:id/undo')
  @ApiOperation({ summary: 'Undo completed operation' })
  async undo(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<BulkOperationResultDto> {
    return this.bulkService.undo(id, user.id, organizationId);
  }
}
```

---

## 9. Permission Model

### 9.1 Permission Requirements

Users can only perform bulk operations on entities they have **write access** to:

```typescript
// apps/backend/src/modules/bulk/services/permission.service.ts

@Injectable()
export class BulkPermissionService {
  constructor(
    private permissionService: PermissionService,
    private prisma: PrismaService,
  ) {}

  /**
   * Filter entities to only those the user can modify
   */
  async filterByPermission(
    entities: any[],
    operationType: BulkOperationType,
    userId: string,
    organizationId: string,
  ): Promise<{ accessible: any[]; skipped: SkippedEntity[] }> {
    const accessible: any[] = [];
    const skipped: SkippedEntity[] = [];

    for (const entity of entities) {
      const canModify = await this.canUserModify(
        entity,
        operationType,
        userId,
        organizationId,
      );

      if (canModify) {
        accessible.push(entity);
      } else {
        skipped.push({
          entityId: entity.id,
          reason: 'No write access',
        });
      }
    }

    return { accessible, skipped };
  }

  private async canUserModify(
    entity: any,
    operationType: BulkOperationType,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Get user's role and scopes
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { scopes: true },
    });

    // Check base permission for operation type
    const requiredPermission = this.getRequiredPermission(operationType);
    if (!this.permissionService.hasPermission(user, requiredPermission)) {
      return false;
    }

    // Check scope access
    return this.permissionService.canAccessEntity(user, entity);
  }

  private getRequiredPermission(operationType: BulkOperationType): Permission {
    const mapping: Record<BulkOperationType, Permission> = {
      [BulkOperationType.ASSIGN]: Permission.CASE_ASSIGN,
      [BulkOperationType.REASSIGN]: Permission.CASE_ASSIGN,
      [BulkOperationType.STATUS_CHANGE]: Permission.CASE_UPDATE,
      [BulkOperationType.CLOSE]: Permission.CASE_CLOSE,
      [BulkOperationType.ARCHIVE]: Permission.CASE_DELETE,
      [BulkOperationType.DELETE]: Permission.CASE_DELETE,
      // ... etc
    };
    return mapping[operationType];
  }
}
```

### 9.2 Operation-Specific Permissions

| Operation | Required Permission | Additional Restrictions |
|-----------|---------------------|------------------------|
| Assign | `{entity}:assign` | Target assignee must be in org |
| Status Change | `{entity}:update` | Valid status transition |
| Close | `{entity}:close` | May require approval workflow |
| Archive | `{entity}:delete` | Admin or Compliance Officer |
| Delete | `{entity}:delete` | Admin only |
| Send Notification | `notifications:send` | Rate limit applies |
| Export | `{entity}:export` | May require approval |

### 9.3 Admin Override

System administrators can override permission checks for emergency operations:

```typescript
interface AdminOverride {
  enabled: boolean;
  reason: string;  // Required audit trail
  approvedBy?: string;  // Second admin approval for critical ops
}
```

---

## 10. AI Integration

### 10.1 AI-Assisted Bulk Operations

Per WORKING-DECISIONS AA.6, AI can **propose** bulk operations but **never auto-execute**:

```typescript
// apps/backend/src/modules/ai/bulk-assistant.service.ts

@Injectable()
export class AIBulkAssistantService {
  constructor(
    private aiService: AIService,
    private bulkService: BulkService,
  ) {}

  /**
   * AI analyzes data and proposes bulk operation
   * Human must confirm before execution
   */
  async proposeBulkOperation(
    prompt: string,
    context: AIContext,
    userId: string,
    organizationId: string,
  ): Promise<AIBulkProposal> {
    // AI analyzes and generates proposal
    const analysis = await this.aiService.analyzeBulkRequest(prompt, context);

    // Create preview (NOT execution)
    const preview = await this.bulkService.createPreview(
      {
        operationType: analysis.suggestedOperation,
        selection: analysis.suggestedSelection,
        changes: analysis.suggestedChanges,
      },
      userId,
      organizationId,
    );

    return {
      proposal: analysis,
      preview,
      requiresHumanConfirmation: true, // ALWAYS true
      aiConfidence: analysis.confidence,
      reasoning: analysis.reasoning,
    };
  }
}
```

### 10.2 AI Guardrails for Bulk Operations

```typescript
// Per WORKING-DECISIONS AA.6

const AI_BULK_GUARDRAILS = {
  // AI can NEVER auto-execute these
  NEVER_AUTO_EXECUTE: [
    BulkOperationType.DELETE,
    BulkOperationType.ARCHIVE,
    BulkOperationType.SEND_NOTIFICATION,
    BulkOperationType.SEND_REMINDER,
  ],

  // Always requires explicit human confirmation
  ALWAYS_CONFIRM: true,

  // Max items AI can propose in single operation
  MAX_AI_PROPOSAL_SIZE: 50,

  // AI must explain its reasoning
  REQUIRE_REASONING: true,
};
```

### 10.3 AI Proposal UX Pattern

```
User: "Send reminders to all managers who haven't completed their Q4 attestations"

AI: "I found 23 managers with incomplete Q4 attestations. Here's what I propose:

**Operation:** Send Reminder
**Recipients:** 23 managers
**Template:** Q4 Attestation Reminder

Sample recipients:
- John Smith (Engineering) - Due: Feb 5
- Sarah Chen (Marketing) - Due: Feb 5
- Mike Rodriguez (Sales) - Due: Feb 5
[+20 more]

**This will send 23 emails immediately upon confirmation.**

[Preview All] [Edit Template] [Confirm & Send] [Cancel]"
```

---

## 11. Rate Limiting

### 11.1 Rate Limit Configuration

Per WORKING-DECISIONS O.1-O.2, bulk operations have higher cost weights:

```typescript
// apps/backend/src/modules/bulk/config/rate-limits.ts

export const BULK_RATE_LIMITS = {
  // Per-user limits (rolling 24 hours)
  perUser: {
    maxOperationsPerDay: 100,
    maxItemsPerDay: 50000,
    maxCriticalOperationsPerDay: 5, // Delete/Archive
  },

  // Cooldown between large operations
  cooldown: {
    threshold: 1000,    // Items
    duration: 5 * 60,   // 5 minutes
  },

  // Concurrent operations per user
  maxConcurrentOperations: 3,

  // By operation type (items per hour)
  byOperationType: {
    [BulkOperationType.DELETE]: 500,
    [BulkOperationType.ARCHIVE]: 1000,
    [BulkOperationType.SEND_NOTIFICATION]: 1000,
    [BulkOperationType.EXPORT]: 100000,
    default: 10000,
  },
};
```

### 11.2 Rate Limit Enforcement

```typescript
// apps/backend/src/modules/bulk/guards/rate-limit.guard.ts

@Injectable()
export class BulkRateLimitGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const organizationId = request.tenantId;

    // Check operations per day
    const opsToday = await this.getOperationsToday(userId);
    if (opsToday >= BULK_RATE_LIMITS.perUser.maxOperationsPerDay) {
      throw new TooManyRequestsException(
        'Daily bulk operation limit reached. Try again tomorrow.',
      );
    }

    // Check concurrent operations
    const concurrent = await this.getConcurrentOperations(userId);
    if (concurrent >= BULK_RATE_LIMITS.maxConcurrentOperations) {
      throw new TooManyRequestsException(
        'Maximum concurrent operations reached. Wait for current operations to complete.',
      );
    }

    // Check cooldown
    const inCooldown = await this.isInCooldown(userId);
    if (inCooldown) {
      const remaining = await this.getCooldownRemaining(userId);
      throw new TooManyRequestsException(
        `Cooldown active after large operation. Try again in ${remaining} seconds.`,
      );
    }

    return true;
  }
}
```

### 11.3 Rate Limit Headers

```typescript
// Response headers for bulk operations
{
  'X-RateLimit-Bulk-Limit': '100',
  'X-RateLimit-Bulk-Remaining': '97',
  'X-RateLimit-Bulk-Reset': '1706918400',
  'X-RateLimit-Items-Limit': '50000',
  'X-RateLimit-Items-Remaining': '45000',
}
```

---

## 12. Undo Support

### 12.1 Supported Undo Operations

Per WORKING-DECISIONS V.6:

| Operation | Undo Supported | Undo Action |
|-----------|---------------|-------------|
| Assign | Yes | Reassign to previous |
| Reassign | Yes | Reassign to previous |
| Status Change | Yes | Revert status |
| Close | Yes | Reopen |
| Archive | Yes | Restore |
| Delete (Soft) | Yes | Restore |
| Delete (Hard) | No | N/A |
| Send Notification | No | Cannot recall |
| Export | No | N/A |
| Field Update | Yes | Revert values |

### 12.2 Undo Implementation

```typescript
// apps/backend/src/modules/bulk/services/undo.service.ts

@Injectable()
export class BulkUndoService {
  constructor(
    private prisma: PrismaService,
    private executor: BulkExecutorService,
  ) {}

  async undo(
    operationId: string,
    userId: string,
    organizationId: string,
  ): Promise<UndoResult> {
    const operation = await this.prisma.bulkOperation.findFirst({
      where: {
        id: operationId,
        organizationId,
        undoAvailable: true,
        undoExpiresAt: { gt: new Date() },
        undoneAt: null,
      },
      include: { items: true },
    });

    if (!operation) {
      throw new BadRequestException('Undo not available for this operation');
    }

    // Process undo for each item
    const results: UndoItemResult[] = [];
    for (const item of operation.items.filter(i => i.status === 'SUCCESS')) {
      try {
        await this.revertItem(item, userId);
        results.push({ entityId: item.entityId, status: 'SUCCESS' });
      } catch (error) {
        results.push({
          entityId: item.entityId,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    // Mark operation as undone
    await this.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        status: BulkOperationStatus.UNDONE,
        undoneAt: new Date(),
        undoneById: userId,
      },
    });

    return {
      operationId,
      status: 'UNDONE',
      undoSuccessCount: results.filter(r => r.status === 'SUCCESS').length,
      undoFailureCount: results.filter(r => r.status === 'FAILED').length,
    };
  }

  private async revertItem(item: BulkOperationItem, userId: string) {
    if (!item.previousValue) {
      throw new Error('No previous value stored for undo');
    }

    // Apply previous value
    await this.executor.applyChange(
      { id: item.entityId },
      item.entityType as BulkEntityType,
      item.previousValue,
      userId,
    );

    // Log undo activity
    await this.activityService.log({
      entityType: item.entityType,
      entityId: item.entityId,
      action: 'undo',
      actionDescription: `Undone via bulk operation undo [${item.bulkOperationId}]`,
      actorUserId: userId,
    });
  }
}
```

### 12.3 Undo Expiration

```typescript
// Undo available for 24 hours after completion
const UNDO_WINDOW_HOURS = 24;

// 24hr delay option for very large destructive operations
const DELAYED_EXECUTION_HOURS = 24;
```

---

## 13. Audit Trail

### 13.1 Audit Requirements

Per WORKING-DECISIONS V.5, full traceability is required:

| Record Type | Purpose |
|-------------|---------|
| BulkOperation | Master record for the batch |
| BulkOperationItem | Per-affected item result |
| Activity Log | Cross-reference: "closed via bulk operation [id]" |
| AUDIT_LOG | Unified audit for compliance |

### 13.2 Activity Log Integration

```typescript
// Every affected entity gets an activity log entry

await this.activityService.log({
  entityType: operation.entityType,
  entityId: entity.id,
  action: operation.operationType.toLowerCase(),
  actionDescription: `${user.name} performed ${operation.operationType} via bulk operation`,
  actorUserId: userId,
  organizationId,
  metadata: {
    bulkOperationId: operation.id,
    bulkOperationCount: operation.totalItems,
    previousValue: previousValue,
    newValue: newValue,
  },
});
```

### 13.3 Bulk Operation Audit Query

```typescript
// Get all items affected by a bulk operation
SELECT *
FROM activity_log
WHERE metadata->>'bulkOperationId' = 'bulk-op-456'
ORDER BY created_at;

// Get all bulk operations affecting an entity
SELECT bo.*
FROM bulk_operation_item boi
JOIN bulk_operation bo ON boi.bulk_operation_id = bo.id
WHERE boi.entity_id = 'case-123'
ORDER BY bo.created_at DESC;
```

---

## 14. UI Specifications

### 14.1 Selection UI

```typescript
// Bulk action toolbar appears when items selected

interface BulkActionToolbar {
  selectedCount: number;
  selectionMode: 'partial' | 'page' | 'all_matching';
  availableActions: BulkAction[];

  // "Select all 1,234 matching items" option
  showSelectAllMatching: boolean;
  totalMatchingCount: number;
}

interface BulkAction {
  type: BulkOperationType;
  label: string;
  icon: string;
  riskLevel: BulkOperationRiskLevel;
  requiresReason: boolean;
}
```

### 14.2 Preview Modal

```typescript
// Preview modal content

interface PreviewModalProps {
  preview: BulkOperationPreview;
  onConfirm: (confirmationText?: string) => void;
  onCancel: () => void;
}

// Structure:
// 1. Impact summary header
// 2. Sample of affected items (expandable)
// 3. Warnings (yellow callout)
// 4. Side effects list
// 5. Confirmation input (if TYPE_CONFIRM required)
// 6. Action buttons
```

### 14.3 Progress Indicator

```typescript
// For async operations

interface ProgressIndicatorProps {
  operationId: string;
  status: BulkOperationStatus;
  progress: number;
  processedItems: number;
  totalItems: number;
  successCount: number;
  failureCount: number;
  estimatedCompletion?: Date;

  onCancel?: () => void;
}
```

### 14.4 Real-Time Updates

```typescript
// WebSocket subscription for progress

// Client subscribes to bulk operation updates
socket.emit('subscribe', {
  channel: `bulk-operation:${operationId}`,
});

// Server emits progress events
socket.on('bulk-operation:progress', (data) => {
  // { operationId, progress, processedItems, status }
});

socket.on('bulk-operation:completed', (data) => {
  // { operationId, status, successCount, failureCount }
});
```

---

## 15. Security Considerations

### 15.1 Tenant Isolation

All bulk operations are strictly scoped by `organization_id`:

```typescript
// Every query includes organization filter
const entities = await this.prisma.case.findMany({
  where: {
    organizationId, // Always required
    id: { in: selection.entityIds },
  },
});
```

### 15.2 Permission Verification

Permissions are verified **before** and **during** execution:

1. **Preview time**: Filter to accessible entities
2. **Execution time**: Re-verify permission for each entity
3. **Post-execution**: Log any permission changes that occurred during execution

### 15.3 Data Validation

```typescript
// Validate all changes before execution
async validateChanges(
  operationType: BulkOperationType,
  changes: Record<string, any>,
): Promise<ValidationResult> {
  const schema = OPERATION_SCHEMAS[operationType];
  return schema.validate(changes);
}
```

### 15.4 Destructive Operation Safeguards

For DELETE and ARCHIVE operations:
- Reason is **required**
- Confirmation text "CONFIRM" required for > 10 items
- 24-hour delay option for very large operations
- Second admin approval for > 1000 items
- Soft delete with 30-day retention before hard delete

### 15.5 Export Security

```typescript
// Export operations have additional controls
{
  // Prevent data exfiltration
  maxExportRows: 50000,

  // Require approval for large exports
  approvalThreshold: 10000,

  // Log all exports
  auditExports: true,

  // Encrypt exported files
  encryptExports: true,

  // Auto-expire download links
  downloadLinkExpiry: 24 * 60 * 60, // 24 hours
}
```

---

## 16. Implementation Guide

### 16.1 Implementation Order

1. **Phase 1: Core Infrastructure**
   - BulkOperation and BulkOperationItem entities
   - Selection validation service
   - Preview generation service
   - Basic API endpoints

2. **Phase 2: Execution Engine**
   - Synchronous executor
   - Operation handlers (Assign, Status Change)
   - Permission integration
   - Activity logging

3. **Phase 3: Async Processing**
   - BullMQ queue setup
   - Async processor
   - Progress tracking
   - WebSocket events

4. **Phase 4: Advanced Features**
   - Undo support
   - Rate limiting
   - AI integration
   - Export operations

5. **Phase 5: UI Components**
   - Selection toolbar
   - Preview modal
   - Progress indicator
   - Operation history

### 16.2 Testing Requirements

```typescript
// Unit tests for each operation handler
describe('BulkAssignHandler', () => {
  it('should assign multiple cases to user');
  it('should skip cases without write access');
  it('should log activity for each assigned case');
  it('should capture previous state for undo');
});

// Integration tests for execution flow
describe('BulkExecutorService', () => {
  it('should execute synchronously for <= 100 items');
  it('should queue async job for > 100 items');
  it('should respect rate limits');
  it('should require confirmation for large batches');
});

// E2E tests for tenant isolation
describe('Bulk Operations E2E', () => {
  it('should not allow bulk operations on other tenant entities');
  it('should filter selection to accessible entities only');
});
```

### 16.3 Monitoring and Alerts

```typescript
// Metrics to track
const BULK_METRICS = {
  // Performance
  'bulk_operation_duration_seconds': Histogram,
  'bulk_operation_items_total': Counter,

  // Success/Failure
  'bulk_operation_success_total': Counter,
  'bulk_operation_failure_total': Counter,

  // Rate limiting
  'bulk_rate_limit_exceeded_total': Counter,

  // Queue health
  'bulk_queue_depth': Gauge,
  'bulk_queue_latency_seconds': Histogram,
};

// Alerts
const BULK_ALERTS = [
  { name: 'bulk_failure_rate_high', threshold: 0.1 },
  { name: 'bulk_queue_depth_high', threshold: 1000 },
  { name: 'bulk_operation_timeout', threshold: 3600 },
];
```

---

## Appendix A: Decision Reference

This specification implements decisions from WORKING-DECISIONS.md:

| Decision ID | Description | Implementation |
|-------------|-------------|----------------|
| V.1 | Dual-mode (visual + query-based) | Section 3 |
| V.2 | Visual selection flow | Section 3.2 |
| V.3 | Query-based flow | Section 3.3 |
| V.4 | Tiered safety guardrails | Section 5.3 |
| V.5 | Full audit traceability | Section 13 |
| V.6 | Undo where possible | Section 12 |
| AA.6 | AI guardrails (always confirm bulk) | Section 10 |
| O.2 | Weighted rate limiting | Section 11 |

---

## Appendix B: Related Specifications

- `TECH-SPEC-AUTH-MULTITENANCY.md` - Permission model, tenant isolation
- `TECH-SPEC-AI-INTEGRATION.md` - AI service patterns
- `TECH-SPEC-WORKFLOW-ENGINE.md` - Workflow integration for approvals
- `TECH-SPEC-REALTIME-COLLABORATION.md` - WebSocket patterns

---

*End of Technical Specification*

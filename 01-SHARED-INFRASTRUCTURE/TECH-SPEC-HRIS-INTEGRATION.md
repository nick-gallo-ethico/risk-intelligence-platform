# HRIS Integration Technical Specification

> **Document Status:** Complete
> **Last Updated:** January 2026
> **Related Documents:** CORE-DATA-MODEL.md (Employee entity), ANALYTICS-DATA-MODEL.md, WORKING-DECISIONS.md (Section 13.C.3)

## 1. Executive Summary

This specification defines how the Risk Intelligence Platform integrates with Human Resource Information Systems (HRIS) to synchronize employee data. The platform uses employee data for:

- **Case Management:** Subject identification, org chart navigation, pattern detection
- **Disclosures:** Employee attestations, conflict of interest declarations
- **Policy Management:** Distribution targeting, attestation campaigns
- **Analytics:** Demographic slicing, department-level reporting

### Design Principles

1. **Data Freshness:** Employee data must be current within 24 hours
2. **Graceful Degradation:** Platform operates without HRIS (manual employee management)
3. **Privacy by Design:** Only sync necessary fields, encrypt sensitive data
4. **Audit Everything:** Full sync history for compliance requirements
5. **Multi-Source Support:** Organizations may have multiple HRIS systems

---

## 2. Integration Architecture

### 2.1 Integration Platform Strategy

**Primary Approach:** Unified HRIS API platform (Merge.dev or Finch)

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Merge.dev** | 180+ integrations, enterprise focus, SOC 2 Type II | Higher cost, some HRIS require enterprise plan | **Primary choice** |
| **Finch** | Strong payroll focus, simpler pricing | Fewer integrations, newer platform | Alternative for payroll-heavy use cases |
| **Direct Integrations** | Full control, no middleware cost | Maintenance burden, slower time-to-market | Only for enterprise custom needs |
| **SFTP/CSV Import** | Works with any system | Manual, error-prone, not real-time | Fallback for legacy systems |

**Decision:** Use Merge.dev as primary integration platform with SFTP import as fallback.

### 2.2 Supported HRIS Systems

#### Tier 1 (Full Integration via Merge.dev)
- Workday
- SAP SuccessFactors
- Oracle HCM Cloud
- ADP Workforce Now
- UKG Pro (UltiPro)
- BambooHR

#### Tier 2 (Standard Integration)
- Namely
- Rippling
- Gusto
- Paylocity
- Paycom
- Ceridian Dayforce

#### Tier 3 (Basic/SFTP)
- Any system with CSV/Excel export
- Legacy on-premise systems
- Regional/niche HRIS

### 2.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HRIS SYSTEMS                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Workday  │  │   ADP    │  │ BambooHR │  │  Legacy  │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │             │                    │
│       ▼             ▼             ▼             │                    │
│  ┌─────────────────────────────────────┐       │                    │
│  │          Merge.dev Platform          │       │                    │
│  │  (Unified API, Webhooks, Caching)   │       │                    │
│  └────────────────┬────────────────────┘       │                    │
└───────────────────┼────────────────────────────┼────────────────────┘
                    │                            │
                    │ REST API                   │ SFTP/CSV
                    ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   RISK INTELLIGENCE PLATFORM                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    HRIS Sync Service                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  Webhook    │  │  Scheduled  │  │   CSV Import        │  │   │
│  │  │  Handler    │  │  Sync Job   │  │   Processor         │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │   │
│  │         │                │                     │              │   │
│  │         └────────────────┼─────────────────────┘              │   │
│  │                          ▼                                    │   │
│  │  ┌─────────────────────────────────────────────────────┐     │   │
│  │  │              Employee Sync Processor                 │     │   │
│  │  │  • Field Mapping  • Validation  • Deduplication     │     │   │
│  │  │  • Change Detection  • Soft Delete Handling         │     │   │
│  │  └────────────────────────┬────────────────────────────┘     │   │
│  └───────────────────────────┼──────────────────────────────────┘   │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │  Employee    │  │ HrisIntegra- │  │  HrisSyncLog     │   │    │
│  │  │  (directory) │  │    tion      │  │  (audit)         │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 HRIS Integration Entity

Stores configuration for each HRIS connection per organization.

```prisma
model HrisIntegration {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Provider configuration
  name              String                    // Display name: "Main Workday Instance"
  provider          HrisProvider              // WORKDAY, ADP, BAMBOOHR, etc.
  integrationMethod IntegrationMethod         // MERGE_API, DIRECT_API, SFTP, MANUAL

  // Connection credentials (encrypted at rest)
  connectionConfig  Json                      // Provider-specific config (encrypted)
  mergeLinkedAccountId String?                // Merge.dev account ID if using Merge

  // Sync configuration
  syncSchedule      String                    // Cron expression: "0 2 * * *" (2 AM daily)
  syncScope         SyncScope                 // FULL, INCREMENTAL, CHANGES_ONLY
  enabledFields     String[]                  // Which fields to sync
  fieldMapping      Json                      // HRIS field → Employee field mapping

  // Status tracking
  status            IntegrationStatus         // ACTIVE, PAUSED, ERROR, PENDING_SETUP
  lastSyncAt        DateTime?
  lastSuccessfulSyncAt DateTime?
  lastErrorMessage  String?
  consecutiveFailures Int                     @default(0)

  // Feature flags
  enableWebhooks    Boolean                   @default(true)
  enableOrgChart    Boolean                   @default(true)
  syncTerminated    Boolean                   @default(false)  // Include terminated employees?
  retentionDays     Int                       @default(365)    // Keep terminated records

  // Audit
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt
  createdBy         String?

  // Relations
  syncLogs          HrisSyncLog[]
  employees         Employee[]

  @@unique([organizationId, mergeLinkedAccountId])
  @@index([organizationId, status])
}

enum HrisProvider {
  WORKDAY
  SAP_SUCCESSFACTORS
  ORACLE_HCM
  ADP_WORKFORCE_NOW
  UKG_PRO
  BAMBOOHR
  NAMELY
  RIPPLING
  GUSTO
  PAYLOCITY
  PAYCOM
  CERIDIAN_DAYFORCE
  CSV_IMPORT
  MANUAL
  OTHER
}

enum IntegrationMethod {
  MERGE_API       // Via Merge.dev unified API
  FINCH_API       // Via Finch unified API
  DIRECT_API      // Direct integration with HRIS API
  SFTP            // File-based sync
  MANUAL          // Manual import/management
}

enum IntegrationStatus {
  PENDING_SETUP   // Initial configuration in progress
  ACTIVE          // Actively syncing
  PAUSED          // Temporarily disabled by admin
  ERROR           // Failed, requires attention
  DISCONNECTED    // HRIS connection lost
}

enum SyncScope {
  FULL            // Replace all records
  INCREMENTAL     // Add/update changed records
  CHANGES_ONLY    // Only webhook-triggered changes
}
```

### 3.2 HRIS Sync Log Entity

Complete audit trail of every sync operation.

```prisma
model HrisSyncLog {
  id              String      @id @default(uuid())
  integrationId   String
  integration     HrisIntegration @relation(fields: [integrationId], references: [id])
  organizationId  String                    // Denormalized for efficient queries

  // Timing
  syncStartedAt   DateTime
  syncCompletedAt DateTime?
  durationMs      Int?

  // Trigger
  triggerType     SyncTriggerType           // SCHEDULED, WEBHOOK, MANUAL, RETRY
  triggeredBy     String?                   // User ID if manual

  // Scope
  syncScope       SyncScope
  syncedFields    String[]                  // Which fields were in scope

  // Results
  status          SyncStatus
  recordsFetched  Int                       @default(0)
  recordsCreated  Int                       @default(0)
  recordsUpdated  Int                       @default(0)
  recordsUnchanged Int                      @default(0)
  recordsSkipped  Int                       @default(0)
  recordsFailed   Int                       @default(0)
  recordsTerminated Int                     @default(0)  // Newly terminated

  // Errors
  errorDetails    Json?                     // Detailed error info
  failedRecords   Json?                     // Array of failed record IDs with reasons
  warnings        String[]                  // Non-fatal issues

  // Metadata
  apiCallCount    Int?                      // Number of API calls made
  bytesTransferred Int?                     // Data volume
  checksum        String?                   // Data integrity verification

  createdAt       DateTime                  @default(now())

  @@index([organizationId, syncStartedAt])
  @@index([integrationId, syncStartedAt])
  @@index([status, syncStartedAt])
}

enum SyncTriggerType {
  SCHEDULED       // Cron-triggered
  WEBHOOK         // HRIS push notification
  MANUAL          // Admin-initiated
  RETRY           // Automatic retry after failure
  ONBOARDING      // Initial data load
}

enum SyncStatus {
  IN_PROGRESS
  SUCCESS
  PARTIAL_SUCCESS // Some records failed
  FAILED          // Complete failure
  CANCELLED       // Manually stopped
  TIMEOUT         // Exceeded time limit
}
```

### 3.3 Employee Entity (Reference)

Defined in CORE-DATA-MODEL.md. Key fields for HRIS sync:

```prisma
model Employee {
  id                String      @id @default(uuid())
  organizationId    String

  // HRIS source tracking
  hrisIntegrationId String?                 // Which HRIS this came from
  hrisEmployeeId    String                  // External ID from HRIS

  // Link to platform user (nullable - most employees won't be platform users)
  userId            String?     @unique
  user              User?       @relation(fields: [userId], references: [id])

  // Core identity
  email             String
  firstName         String
  lastName          String
  preferredName     String?

  // Employment details
  employeeNumber    String?                 // Company employee ID
  jobTitle          String?
  department        String?
  departmentId      String?                 // For hierarchy
  costCenter        String?

  // Location
  locationId        String?
  location          Location?   @relation(fields: [locationId], references: [id])
  workCountry       String?
  workState         String?
  workCity          String?
  timezone          String?

  // Manager (self-referential)
  managerId         String?
  manager           Employee?   @relation("ManagerReports", fields: [managerId], references: [id])
  directReports     Employee[]  @relation("ManagerReports")
  managerHrisId     String?                 // External ID for linking before internal ID exists

  // Employment status
  employmentStatus  EmploymentStatus
  employmentType    EmploymentType?         // FULL_TIME, PART_TIME, CONTRACTOR
  hireDate          DateTime?
  terminationDate   DateTime?

  // Sync metadata
  syncedAt          DateTime                // Last sync timestamp
  syncSource        String?                 // Which sync populated this
  rawHrisData       Json?                   // Original HRIS payload (for debugging)

  // Custom fields (tenant-configurable)
  customFields      Json?                   // Flexible additional data

  // Audit
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  isActive          Boolean                 @default(true)

  // Platform relationships
  casesAsSubject    CaseSubject[]
  disclosures       Disclosure[]
  attestations      PolicyAttestation[]

  @@unique([organizationId, hrisEmployeeId])
  @@unique([organizationId, email])
  @@index([organizationId, employmentStatus])
  @@index([organizationId, department])
  @@index([organizationId, managerId])
  @@index([organizationId, locationId])
}

enum EmploymentStatus {
  ACTIVE
  TERMINATED
  ON_LEAVE
  PENDING_START    // Hired but not started
  SUSPENDED
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
  INTERN
  TEMPORARY
}
```

### 3.4 Field Mapping Configuration

```typescript
// Default field mapping for common HRIS providers
interface FieldMapping {
  // Target field in Employee model
  [targetField: string]: {
    // Source field path in HRIS data (supports dot notation)
    sourceField: string;
    // Optional transformation
    transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'boolean' | 'custom';
    // Custom transformer function name (if transform === 'custom')
    customTransformer?: string;
    // Default value if source is null/undefined
    defaultValue?: any;
    // Required for sync to succeed
    required?: boolean;
  };
}

// Example: Workday field mapping
const workdayFieldMapping: FieldMapping = {
  hrisEmployeeId: { sourceField: 'id', required: true },
  email: { sourceField: 'work_email', required: true, transform: 'lowercase' },
  firstName: { sourceField: 'first_name', required: true, transform: 'trim' },
  lastName: { sourceField: 'last_name', required: true, transform: 'trim' },
  preferredName: { sourceField: 'preferred_name' },
  employeeNumber: { sourceField: 'employee_number' },
  jobTitle: { sourceField: 'job_title' },
  department: { sourceField: 'department.name' },
  departmentId: { sourceField: 'department.id' },
  managerHrisId: { sourceField: 'manager.id' },
  employmentStatus: {
    sourceField: 'employment_status',
    transform: 'custom',
    customTransformer: 'mapWorkdayStatus'
  },
  employmentType: { sourceField: 'employment_type' },
  hireDate: { sourceField: 'hire_date', transform: 'date' },
  terminationDate: { sourceField: 'termination_date', transform: 'date' },
  workCountry: { sourceField: 'work_location.country' },
  workState: { sourceField: 'work_location.state' },
  workCity: { sourceField: 'work_location.city' },
};
```

---

## 4. Sync Operations

### 4.1 Sync Strategies

#### Full Sync
- **When:** Initial onboarding, data integrity checks, monthly reconciliation
- **Process:** Fetch all employees from HRIS, compare with local, create/update/soft-delete
- **Duration:** Minutes to hours depending on org size
- **Impact:** High API usage, potential for temporary inconsistency

#### Incremental Sync
- **When:** Daily scheduled sync
- **Process:** Fetch only records modified since last sync (if HRIS supports)
- **Duration:** Seconds to minutes
- **Fallback:** Full sync if HRIS doesn't support incremental

#### Webhook-Triggered Sync
- **When:** Real-time updates (Merge.dev webhooks)
- **Process:** Process single employee change
- **Duration:** Milliseconds
- **Events:** employee.created, employee.updated, employee.deleted

### 4.2 Sync Process Flow

```typescript
async function executeSync(
  integration: HrisIntegration,
  scope: SyncScope,
  trigger: SyncTriggerType
): Promise<HrisSyncLog> {
  const syncLog = await createSyncLog(integration, scope, trigger);

  try {
    // 1. Fetch employees from HRIS
    const hrisEmployees = await fetchFromHris(integration, scope);
    syncLog.recordsFetched = hrisEmployees.length;

    // 2. Get current employees from database
    const localEmployees = await getLocalEmployees(integration.organizationId);
    const localByHrisId = new Map(localEmployees.map(e => [e.hrisEmployeeId, e]));

    // 3. Process each HRIS employee
    for (const hrisEmployee of hrisEmployees) {
      try {
        const mapped = applyFieldMapping(hrisEmployee, integration.fieldMapping);
        const validation = validateEmployee(mapped);

        if (!validation.valid) {
          syncLog.recordsSkipped++;
          syncLog.warnings.push(`Skipped ${hrisEmployee.id}: ${validation.errors.join(', ')}`);
          continue;
        }

        const existing = localByHrisId.get(hrisEmployee.id);

        if (!existing) {
          // Create new employee
          await createEmployee(integration.organizationId, mapped, integration.id);
          syncLog.recordsCreated++;
        } else if (hasChanges(existing, mapped)) {
          // Update existing employee
          await updateEmployee(existing.id, mapped);
          syncLog.recordsUpdated++;
        } else {
          syncLog.recordsUnchanged++;
        }

        // Mark as seen for termination detection
        localByHrisId.delete(hrisEmployee.id);

      } catch (error) {
        syncLog.recordsFailed++;
        syncLog.failedRecords.push({ id: hrisEmployee.id, error: error.message });
      }
    }

    // 4. Handle employees no longer in HRIS (terminations)
    if (scope === SyncScope.FULL) {
      for (const [hrisId, employee] of localByHrisId) {
        if (employee.employmentStatus !== EmploymentStatus.TERMINATED) {
          await softTerminateEmployee(employee.id);
          syncLog.recordsTerminated++;
        }
      }
    }

    // 5. Resolve manager relationships (second pass)
    await resolveManagerRelationships(integration.organizationId);

    syncLog.status = syncLog.recordsFailed > 0 ? SyncStatus.PARTIAL_SUCCESS : SyncStatus.SUCCESS;

  } catch (error) {
    syncLog.status = SyncStatus.FAILED;
    syncLog.errorDetails = { message: error.message, stack: error.stack };

    // Increment consecutive failures
    await incrementConsecutiveFailures(integration.id);

    // Alert if threshold exceeded
    if (integration.consecutiveFailures >= 3) {
      await alertHrisSyncFailure(integration);
    }
  }

  syncLog.syncCompletedAt = new Date();
  syncLog.durationMs = syncLog.syncCompletedAt - syncLog.syncStartedAt;

  await saveSyncLog(syncLog);
  await updateIntegrationStatus(integration.id, syncLog);

  return syncLog;
}
```

### 4.3 Manager Resolution

Manager relationships require special handling because managers may not exist yet during initial sync:

```typescript
async function resolveManagerRelationships(organizationId: string): Promise<void> {
  // Find employees with unresolved manager links
  const unresolved = await prisma.employee.findMany({
    where: {
      organizationId,
      managerHrisId: { not: null },
      managerId: null,
      employmentStatus: EmploymentStatus.ACTIVE
    }
  });

  for (const employee of unresolved) {
    // Look up manager by HRIS ID
    const manager = await prisma.employee.findUnique({
      where: {
        organizationId_hrisEmployeeId: {
          organizationId,
          hrisEmployeeId: employee.managerHrisId
        }
      }
    });

    if (manager) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { managerId: manager.id }
      });
    }
  }
}
```

### 4.4 Change Detection

```typescript
interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFields: string[];
}

function detectChanges(
  existing: Employee,
  incoming: MappedEmployee
): ChangeDetectionResult {
  const TRACKED_FIELDS = [
    'email', 'firstName', 'lastName', 'preferredName',
    'jobTitle', 'department', 'departmentId', 'costCenter',
    'managerId', 'managerHrisId',
    'employmentStatus', 'employmentType',
    'hireDate', 'terminationDate',
    'workCountry', 'workState', 'workCity', 'timezone'
  ];

  const changedFields: string[] = [];

  for (const field of TRACKED_FIELDS) {
    const existingValue = existing[field];
    const incomingValue = incoming[field];

    if (!isEqual(existingValue, incomingValue)) {
      changedFields.push(field);
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields
  };
}
```

---

## 5. Sync Frequency & Data Freshness

### 5.1 Requirements

| Data Type | Freshness Requirement | Sync Strategy |
|-----------|----------------------|---------------|
| New hires | Within 24 hours | Daily sync + webhook |
| Terminations | Within 24 hours | Daily sync + webhook |
| Title/department changes | Within 24 hours | Daily sync + webhook |
| Manager changes | Within 24 hours | Daily sync + webhook |
| Contact info changes | Within 48 hours | Daily sync |
| Location changes | Within 48 hours | Daily sync |

### 5.2 Default Sync Schedule

```typescript
const DEFAULT_SYNC_SCHEDULES = {
  // Full sync: 2 AM on Sundays (low activity)
  fullSync: '0 2 * * 0',

  // Incremental sync: Every 4 hours
  incrementalSync: '0 */4 * * *',

  // Webhook processing: Real-time (no schedule)
  webhooks: 'real-time',

  // Reconciliation: Monthly on 1st at 3 AM
  reconciliation: '0 3 1 * *'
};
```

### 5.3 Staleness Detection

```typescript
interface StalenessCheck {
  isStale: boolean;
  lastSyncAt: DateTime;
  hoursSinceSync: number;
  threshold: number;
}

async function checkDataFreshness(
  organizationId: string
): Promise<StalenessCheck> {
  const integration = await getActiveIntegration(organizationId);

  if (!integration || !integration.lastSuccessfulSyncAt) {
    return {
      isStale: true,
      lastSyncAt: null,
      hoursSinceSync: Infinity,
      threshold: 24
    };
  }

  const hoursSinceSync = differenceInHours(
    new Date(),
    integration.lastSuccessfulSyncAt
  );

  // Threshold based on integration method
  const threshold = integration.enableWebhooks ? 48 : 24;

  return {
    isStale: hoursSinceSync > threshold,
    lastSyncAt: integration.lastSuccessfulSyncAt,
    hoursSinceSync,
    threshold
  };
}
```

### 5.4 Freshness Enforcement

When employee data is used in critical operations:

```typescript
async function getEmployeeWithFreshnessCheck(
  organizationId: string,
  employeeId: string
): Promise<Employee> {
  const freshness = await checkDataFreshness(organizationId);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  });

  if (!employee) {
    throw new NotFoundException('Employee not found');
  }

  // Attach freshness warning to response
  if (freshness.isStale) {
    employee.metadata = {
      ...employee.metadata,
      freshnessWarning: {
        isStale: true,
        lastSyncAt: freshness.lastSyncAt,
        message: `Employee data may be outdated (last sync: ${freshness.hoursSinceSync} hours ago)`
      }
    };
  }

  return employee;
}
```

---

## 6. Webhook Integration

### 6.1 Merge.dev Webhook Events

```typescript
// Supported webhook events from Merge.dev
type MergeWebhookEvent =
  | 'employee.created'
  | 'employee.updated'
  | 'employee.deleted'
  | 'sync.completed'
  | 'link.deleted';       // Integration disconnected

interface MergeWebhookPayload {
  event: MergeWebhookEvent;
  linked_account_id: string;
  data: {
    id: string;           // Merge employee ID
    remote_id: string;    // HRIS employee ID
    model: 'Employee';
    changed_fields?: string[];
    // ... employee data
  };
  timestamp: string;
}
```

### 6.2 Webhook Handler

```typescript
@Controller('webhooks/hris')
export class HrisWebhookController {
  @Post('merge')
  @HttpCode(200)
  async handleMergeWebhook(
    @Headers('X-Merge-Signature') signature: string,
    @Body() payload: MergeWebhookPayload
  ): Promise<void> {
    // 1. Verify signature
    if (!this.verifyMergeSignature(signature, payload)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 2. Find integration by linked account ID
    const integration = await this.hrisService.findByMergeAccountId(
      payload.linked_account_id
    );

    if (!integration) {
      this.logger.warn(`Unknown linked account: ${payload.linked_account_id}`);
      return; // Return 200 to prevent retries
    }

    // 3. Process event
    switch (payload.event) {
      case 'employee.created':
        await this.hrisService.processEmployeeCreated(integration, payload.data);
        break;

      case 'employee.updated':
        await this.hrisService.processEmployeeUpdated(integration, payload.data);
        break;

      case 'employee.deleted':
        await this.hrisService.processEmployeeDeleted(integration, payload.data);
        break;

      case 'sync.completed':
        await this.hrisService.processSyncCompleted(integration, payload.data);
        break;

      case 'link.deleted':
        await this.hrisService.processIntegrationDisconnected(integration);
        break;
    }

    // 4. Log webhook receipt
    await this.auditService.log({
      entityType: 'HrisIntegration',
      entityId: integration.id,
      action: 'webhook_received',
      context: { event: payload.event, timestamp: payload.timestamp }
    });
  }
}
```

---

## 7. Error Handling & Recovery

### 7.1 Error Categories

| Category | Examples | Retry Strategy | Alert Threshold |
|----------|----------|----------------|-----------------|
| **Transient** | Rate limit, timeout, network error | Exponential backoff, max 3 retries | After 3 consecutive failures |
| **Auth** | Token expired, credentials invalid | Pause integration, notify admin | Immediate |
| **Data** | Invalid field value, missing required field | Skip record, log warning | >5% failure rate |
| **Config** | Field mapping error, unknown field | Pause integration, notify admin | Immediate |
| **Quota** | API limit exceeded | Wait until reset, reschedule | At 80% quota |

### 7.2 Retry Logic

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,

  // Retryable error codes
  retryableErrors: [
    'RATE_LIMIT_EXCEEDED',
    'TIMEOUT',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_SERVER_ERROR'
  ]
};

async function withRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs
      );

      this.logger.warn(
        `${context}: Attempt ${attempt} failed, retrying in ${delay}ms`,
        { error: error.message }
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
```

### 7.3 Circuit Breaker

```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailure: DateTime | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  openedAt: DateTime | null;
}

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Open after 5 failures
  recoveryTimeMs: 300000,     // 5 minutes before half-open
  successThreshold: 2         // Close after 2 successes in half-open
};

class HrisCircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailure: null,
    state: 'CLOSED',
    openedAt: null
  };

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (this.shouldAttemptRecovery()) {
        this.state.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
```

### 7.4 Alert Configuration

```typescript
const ALERT_RULES = {
  syncFailure: {
    threshold: 3,           // Consecutive failures
    channels: ['email', 'slack'],
    recipients: ['hris-admin@tenant.com', '#compliance-alerts'],
    message: 'HRIS sync has failed {count} consecutive times'
  },

  dataQuality: {
    threshold: 0.05,        // >5% record failure rate
    channels: ['email'],
    recipients: ['hris-admin@tenant.com'],
    message: 'HRIS sync data quality issue: {failureRate}% of records failed'
  },

  staleData: {
    threshold: 48,          // Hours since last sync
    channels: ['email', 'slack'],
    recipients: ['hris-admin@tenant.com'],
    message: 'Employee data is stale: last successful sync was {hours} hours ago'
  },

  disconnection: {
    threshold: 1,           // Any disconnection
    channels: ['email', 'slack'],
    recipients: ['hris-admin@tenant.com', 'system-admin@tenant.com'],
    message: 'HRIS integration has been disconnected: {provider}'
  }
};
```

---

## 8. CSV/SFTP Import

### 8.1 CSV Format Specification

For organizations without API-capable HRIS:

```csv
employee_id,email,first_name,last_name,job_title,department,manager_email,employment_status,hire_date,termination_date
EMP001,john.doe@company.com,John,Doe,Software Engineer,Engineering,jane.smith@company.com,ACTIVE,2023-01-15,
EMP002,jane.smith@company.com,Jane,Smith,Engineering Manager,Engineering,,ACTIVE,2022-06-01,
EMP003,bob.wilson@company.com,Bob,Wilson,Sales Rep,Sales,alice.jones@company.com,TERMINATED,2021-03-01,2024-01-31
```

### 8.2 Required Fields

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| employee_id | Yes | String | Unique identifier from source system |
| email | Yes | Email | Must be valid email format |
| first_name | Yes | String | Max 100 characters |
| last_name | Yes | String | Max 100 characters |
| employment_status | Yes | Enum | ACTIVE, TERMINATED, ON_LEAVE |

### 8.3 Optional Fields

| Field | Format | Notes |
|-------|--------|-------|
| preferred_name | String | Display name |
| job_title | String | Current job title |
| department | String | Department name |
| department_id | String | Department code/ID |
| manager_email | Email | Manager's email (for linking) |
| manager_id | String | Manager's employee_id (alternative) |
| cost_center | String | Cost center code |
| employment_type | Enum | FULL_TIME, PART_TIME, CONTRACTOR, INTERN |
| hire_date | Date | YYYY-MM-DD format |
| termination_date | Date | YYYY-MM-DD format |
| work_country | String | ISO 3166-1 alpha-2 code |
| work_state | String | State/province |
| work_city | String | City name |
| timezone | String | IANA timezone (America/New_York) |

### 8.4 Import Process

```typescript
@Injectable()
export class CsvImportService {
  async importEmployees(
    organizationId: string,
    file: Express.Multer.File,
    options: ImportOptions
  ): Promise<ImportResult> {
    // 1. Validate file
    const validation = await this.validateCsvFile(file);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Parse CSV
    const records = await this.parseCsv(file, options.encoding);

    // 3. Create or get manual integration
    const integration = await this.getOrCreateManualIntegration(organizationId);

    // 4. Start sync log
    const syncLog = await this.createSyncLog(integration, SyncTriggerType.MANUAL);

    // 5. Process records
    const results = await this.processRecords(
      organizationId,
      integration.id,
      records,
      options
    );

    // 6. Finalize
    await this.finalizeSyncLog(syncLog, results);

    return {
      success: true,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors
    };
  }
}
```

### 8.5 SFTP Configuration

```typescript
interface SftpConfig {
  host: string;
  port: number;                // Default: 22
  username: string;
  authMethod: 'password' | 'key';
  password?: string;           // Encrypted
  privateKey?: string;         // Encrypted
  remotePath: string;          // /exports/employees/
  filePattern: string;         // employees_*.csv
  archivePath?: string;        // /exports/employees/processed/
  schedule: string;            // Cron: 0 3 * * *
}
```

---

## 9. Security

### 9.1 Credential Storage

```typescript
// Connection config structure (encrypted at rest)
interface EncryptedConnectionConfig {
  // Encrypted using organization's encryption key
  encrypted: string;
  // Key version for rotation
  keyVersion: number;
  // Algorithm used
  algorithm: 'aes-256-gcm';
}

// Decrypted config structure (provider-specific)
interface WorkdayConnectionConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  apiEndpoint: string;
}

interface MergeConnectionConfig {
  linkedAccountId: string;
  accountToken: string;        // Scoped to this integration
}

interface SftpConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}
```

### 9.2 Data Minimization

Only sync fields necessary for platform functionality:

```typescript
const ALLOWED_SYNC_FIELDS = [
  // Required
  'hrisEmployeeId', 'email', 'firstName', 'lastName', 'employmentStatus',

  // Recommended
  'jobTitle', 'department', 'managerId', 'hireDate', 'terminationDate',

  // Optional
  'preferredName', 'employeeNumber', 'costCenter', 'employmentType',
  'workCountry', 'workState', 'workCity', 'timezone',

  // Excluded (PII not needed)
  // 'ssn', 'dateOfBirth', 'homeAddress', 'salary', 'bankAccount',
  // 'emergencyContact', 'medicalInfo', 'performanceReviews'
];
```

### 9.3 Audit Trail

All HRIS operations are logged:

```typescript
// HRIS-specific audit events
type HrisAuditAction =
  | 'integration_created'
  | 'integration_updated'
  | 'integration_deleted'
  | 'integration_paused'
  | 'integration_resumed'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'webhook_received'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_terminated'
  | 'csv_import_started'
  | 'csv_import_completed'
  | 'credentials_rotated';
```

---

## 10. API Endpoints

### 10.1 Integration Management

```typescript
// List HRIS integrations
GET /api/v1/hris/integrations
Response: {
  items: HrisIntegration[],
  total: number
}

// Get integration details
GET /api/v1/hris/integrations/:id
Response: HrisIntegration

// Create integration
POST /api/v1/hris/integrations
Body: {
  name: string,
  provider: HrisProvider,
  integrationMethod: IntegrationMethod,
  connectionConfig: object,
  syncSchedule?: string,
  fieldMapping?: FieldMapping
}
Response: HrisIntegration

// Update integration
PATCH /api/v1/hris/integrations/:id
Body: Partial<HrisIntegration>
Response: HrisIntegration

// Delete integration
DELETE /api/v1/hris/integrations/:id
Response: { success: true }

// Test connection
POST /api/v1/hris/integrations/:id/test
Response: {
  success: boolean,
  message: string,
  details?: object
}

// Pause/resume integration
POST /api/v1/hris/integrations/:id/pause
POST /api/v1/hris/integrations/:id/resume
Response: HrisIntegration
```

### 10.2 Sync Operations

```typescript
// Trigger manual sync
POST /api/v1/hris/integrations/:id/sync
Body: {
  scope?: SyncScope,       // Default: INCREMENTAL
  dryRun?: boolean         // Preview without saving
}
Response: HrisSyncLog

// Get sync history
GET /api/v1/hris/integrations/:id/sync-logs
Query: {
  page?: number,
  limit?: number,
  status?: SyncStatus,
  startDate?: string,
  endDate?: string
}
Response: {
  items: HrisSyncLog[],
  total: number
}

// Get sync log details
GET /api/v1/hris/sync-logs/:id
Response: HrisSyncLog (with failedRecords detail)
```

### 10.3 CSV Import

```typescript
// Validate CSV file (preview)
POST /api/v1/hris/import/validate
Content-Type: multipart/form-data
Body: { file: File }
Response: {
  valid: boolean,
  totalRows: number,
  validRows: number,
  errors: ValidationError[],
  preview: Employee[]       // First 10 records
}

// Execute CSV import
POST /api/v1/hris/import
Content-Type: multipart/form-data
Body: {
  file: File,
  options: {
    updateExisting?: boolean,    // Default: true
    terminateMissing?: boolean,  // Default: false
    dryRun?: boolean
  }
}
Response: ImportResult

// Get import template
GET /api/v1/hris/import/template
Response: CSV file download
```

### 10.4 Employee Directory

```typescript
// List employees (with filters)
GET /api/v1/employees
Query: {
  page?: number,
  limit?: number,
  search?: string,
  department?: string,
  status?: EmploymentStatus,
  managerId?: string,
  locationId?: string
}
Response: {
  items: Employee[],
  total: number,
  freshnessWarning?: FreshnessWarning
}

// Get employee details
GET /api/v1/employees/:id
Response: Employee (with manager, directReports)

// Get employee org chart
GET /api/v1/employees/:id/org-chart
Query: {
  depth?: number          // Levels up/down to include
}
Response: OrgChartNode

// Search employees
GET /api/v1/employees/search
Query: {
  q: string,              // Search query
  limit?: number
}
Response: Employee[]

// Get employee statistics
GET /api/v1/employees/stats
Response: {
  total: number,
  byStatus: { [status: string]: number },
  byDepartment: { [department: string]: number },
  lastSyncAt: DateTime,
  isStale: boolean
}
```

---

## 11. Admin UI

### 11.1 Integration Setup Wizard

```
┌─────────────────────────────────────────────────────────────────────┐
│ HRIS Integration Setup                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1 of 4: Choose Your HRIS                                      │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Workday   │ │     ADP     │ │  BambooHR   │ │    UKG      │   │
│  │     [✓]     │ │     [ ]     │ │     [ ]     │ │     [ ]     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │    Oracle   │ │     SAP     │ │   Namely    │ │   Other     │   │
│  │     [ ]     │ │     [ ]     │ │     [ ]     │ │     [ ]     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                     │
│  Don't see your HRIS? You can import employees via CSV.             │
│                                                                     │
│                                          [Back]  [Continue →]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Sync Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ HRIS Sync Status                                    [⟳ Sync Now]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Workday Integration                              ● Active    │   │
│  │                                                              │   │
│  │ Last sync: 2 hours ago (Jan 28, 2026 10:00 AM)              │   │
│  │ Next scheduled: Today at 2:00 PM                            │   │
│  │                                                              │   │
│  │ ┌──────────────────────────────────────────────────────┐    │   │
│  │ │ Total Employees │ Last Sync Results │ Data Freshness │    │   │
│  │ │      2,547      │  ✓ 2,540 synced   │    ✓ Fresh     │    │   │
│  │ │                 │  ⚠ 7 warnings     │                │    │   │
│  │ └──────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │ [View Sync History]  [Edit Settings]  [⋯ More]              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Recent Sync Activity                                               │
│  ────────────────────────────────────────────────────────────────   │
│  ✓ Jan 28, 10:00 AM  Scheduled sync  2,540 records  12.3s          │
│  ✓ Jan 28, 6:00 AM   Scheduled sync  2,538 records  11.8s          │
│  ✓ Jan 27, 2:00 PM   Scheduled sync  2,535 records  12.1s          │
│  ⚠ Jan 27, 10:00 AM  Scheduled sync  2,530 records  15.2s  7 warn  │
│  ✓ Jan 27, 6:00 AM   Scheduled sync  2,528 records  11.5s          │
│                                                                     │
│                                          [View All Sync Logs →]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Checklist

### Phase 1: Foundation
- [ ] Create database schema (HrisIntegration, HrisSyncLog, Employee)
- [ ] Implement encryption service for connection configs
- [ ] Build base sync service with change detection
- [ ] Create CSV import functionality
- [ ] Build admin UI for integration management

### Phase 2: Merge.dev Integration
- [ ] Set up Merge.dev account and API credentials
- [ ] Implement Merge.dev OAuth link flow
- [ ] Build Merge.dev API client
- [ ] Implement webhook handler
- [ ] Configure field mappings for Tier 1 HRIS

### Phase 3: Operational
- [ ] Implement sync scheduling (BullMQ jobs)
- [ ] Build retry logic and circuit breaker
- [ ] Set up alerting for sync failures
- [ ] Create sync dashboard UI
- [ ] Implement freshness checks

### Phase 4: Advanced
- [ ] SFTP import support
- [ ] Custom field mapping UI
- [ ] Org chart visualization
- [ ] Manager resolution automation
- [ ] Bulk operations (terminate all from list)

---

## 13. Appendix: Provider-Specific Notes

### Workday
- Requires tenant-specific API endpoint
- Uses OAuth 2.0 with refresh tokens
- Supports incremental sync via `lastModified` filter
- Custom reports may be needed for some fields

### ADP Workforce Now
- Uses OAuth 2.0 with certificate authentication
- Different API versions for different modules
- Rate limits: 10 requests/second
- No native webhook support (use polling)

### BambooHR
- API key authentication
- Well-documented REST API
- Supports webhooks for employee changes
- Custom fields require separate API call

### SAP SuccessFactors
- OData API with OAuth 2.0
- Complex data model with multiple entities
- Rate limits vary by module
- Requires careful pagination handling

---

*Document Version: 1.0*
*Last Updated: January 2026*

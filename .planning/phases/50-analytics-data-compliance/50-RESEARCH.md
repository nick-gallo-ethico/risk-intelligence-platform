# Phase 50: Analytics & Data Compliance - Research

**Researched:** 2026-02-28
**Domain:** Analytics fact tables, dashboard builder, scheduled reports, GDPR compliance, virus scanning
**Confidence:** HIGH (existing infrastructure, clear specifications, verified patterns)

## Summary

Phase 50 builds on the existing Phase 11 analytics foundation to implement fact tables for fast analytics, a drag-and-drop dashboard widget builder, scheduled report delivery via email, peer benchmarking with anonymized data, GDPR-compliant cryptographic shredding, data retention policies, and virus scanning for uploads.

The codebase already has substantial analytics infrastructure: DashboardConfigService, WidgetDataService, ScheduledExportService, and supporting services. The ANALYTICS-DATA-MODEL.md document provides complete specifications for fact tables (CaseFact, DisclosureFact, FormFact, AttestationFact). The jobs module with BullMQ is established for scheduled tasks.

**Primary recommendation:** Implement fact tables as Prisma models with event-driven incremental aggregation via BullMQ jobs, add react-grid-layout for drag-drop dashboard editing, and integrate cryptographic shredding using Node.js crypto with Azure Key Vault for key management.

## Standard Stack

### Core (Already in Codebase)

| Library                 | Version | Purpose                               | Why Standard                                         |
| ----------------------- | ------- | ------------------------------------- | ---------------------------------------------------- |
| @nestjs/bullmq          | ^11.0.4 | Job scheduling (reports, aggregation) | Already integrated, supports cron, retry strategies  |
| @nestjs/cache-manager   | ^2.3.0  | Widget data caching                   | Already configured with Redis                        |
| @azure/keyvault-secrets | ^4.10.0 | Encryption key management             | Already installed, Azure-native for GDPR key storage |
| recharts                | ^3.7.0  | Chart rendering                       | Already in frontend, works with widget data          |
| exceljs                 | ^4.4.0  | Excel report generation               | Already used for exports                             |

### New Dependencies - Backend

| Library     | Version | Purpose                       | Why Standard                                             |
| ----------- | ------- | ----------------------------- | -------------------------------------------------------- |
| clamscan    | ^2.4.0  | ClamAV virus scanning wrapper | Standard Node.js ClamAV integration, supports socket/TCP |
| cron-parser | ^4.9.0  | Parse cron expressions        | BullMQ dependency, needed for schedule validation        |

### New Dependencies - Frontend

| Library                  | Version | Purpose                  | Why Standard                                                     |
| ------------------------ | ------- | ------------------------ | ---------------------------------------------------------------- |
| react-grid-layout        | ^1.4.4  | Drag-drop widget layouts | Industry standard for dashboard builders, responsive breakpoints |
| @types/react-grid-layout | ^1.3.5  | TypeScript definitions   | Type safety for layout management                                |

### Alternatives Considered

| Instead of        | Could Use                    | Tradeoff                                                                                                          |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| react-grid-layout | @dnd-kit (already installed) | @dnd-kit is lower-level; react-grid-layout provides built-in responsive layouts, collision detection, persistence |
| ClamAV            | Azure Defender for Storage   | Azure Defender is managed but costs extra; ClamAV is free and more controllable                                   |
| Node.js crypto    | sodium-native                | sodium-native is faster but crypto is built-in and sufficient for per-record encryption                           |

**Installation:**

```bash
# Backend
cd apps/backend && npm install clamscan

# Frontend
cd apps/frontend && npm install react-grid-layout @types/react-grid-layout
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── analytics/
│   ├── facts/                    # NEW: Fact table services
│   │   ├── fact.module.ts
│   │   ├── services/
│   │   │   ├── fact-aggregation.service.ts    # Incremental aggregation
│   │   │   ├── fact-refresh.service.ts        # Full refresh + reconciliation
│   │   │   ├── fact-case.service.ts           # Case-specific queries
│   │   │   ├── fact-campaign.service.ts       # Campaign-specific queries
│   │   │   └── fact-riu.service.ts            # RIU-specific queries
│   │   └── processors/
│   │       └── fact-aggregation.processor.ts  # BullMQ processor
│   ├── dashboard/                # EXISTING: Extend with builder
│   │   └── services/
│   │       └── widget-builder.service.ts      # NEW: Widget CRUD
│   ├── benchmarking/             # NEW: Peer benchmarking
│   │   ├── benchmarking.module.ts
│   │   ├── benchmarking.service.ts
│   │   └── processors/
│   │       └── benchmarking.processor.ts
├── compliance/                   # NEW: GDPR and data lifecycle
│   ├── compliance.module.ts
│   ├── services/
│   │   ├── crypto-shredding.service.ts        # PII encryption/key deletion
│   │   ├── key-management.service.ts          # Azure Key Vault wrapper
│   │   ├── retention-policy.service.ts        # Auto-archive logic
│   │   └── data-erasure.service.ts            # GDPR erasure workflow
│   └── processors/
│       ├── retention.processor.ts             # Scheduled archive jobs
│       └── erasure.processor.ts               # Erasure request processing
├── storage/
│   └── services/
│       └── virus-scan.service.ts              # NEW: ClamAV integration

apps/frontend/src/
├── components/
│   └── dashboard/
│       ├── widget-builder/       # NEW: Drag-drop builder UI
│       │   ├── widget-palette.tsx
│       │   ├── dashboard-grid.tsx
│       │   ├── widget-config-panel.tsx
│       │   └── responsive-layout-controls.tsx
```

### Pattern 1: Fact Table Incremental Aggregation

**What:** Event-driven updates to fact tables when source data changes, with nightly full reconciliation.
**When to use:** For analytics queries that need sub-second response on aggregated data.

```typescript
// Source: Existing analytics patterns + BullMQ documentation
// Event-driven: Emit events on Case/RIU changes
@Injectable()
export class FactAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("fact-aggregation") private factQueue: Queue,
  ) {}

  // Called by Case/RIU event listeners
  async queueIncrementalUpdate(
    entityType: "case" | "riu" | "campaign",
    entityId: string,
  ) {
    await this.factQueue.add(
      "incremental-update",
      {
        entityType,
        entityId,
        timestamp: new Date(),
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      },
    );
  }

  // Nightly full reconciliation
  async scheduleNightlyReconciliation() {
    await this.factQueue.add(
      "full-reconciliation",
      {},
      {
        repeat: { pattern: "0 2 * * *" }, // 2 AM daily
        jobId: "nightly-fact-reconciliation",
      },
    );
  }
}
```

### Pattern 2: Cryptographic Shredding for GDPR

**What:** Encrypt PII fields with per-record keys; delete keys to "forget" data.
**When to use:** GDPR right-to-erasure on immutable records (RIUs, audit logs).

```typescript
// Source: Crypto-shredding patterns from Thoughtworks, industry best practices
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

@Injectable()
export class CryptoShreddingService {
  private readonly algorithm = "aes-256-gcm";

  constructor(
    private readonly keyVault: KeyManagementService,
    private readonly prisma: PrismaService,
  ) {}

  // Encrypt PII and store key reference
  async encryptPiiFields(
    entityType: string,
    entityId: string,
    piiData: Record<string, string>,
  ): Promise<{ encryptedData: Record<string, string>; keyId: string }> {
    // Generate unique key for this record
    const dataKey = randomBytes(32);
    const iv = randomBytes(16);

    // Store key in Key Vault with entity reference
    const keyId = await this.keyVault.storeKey(
      `${entityType}-${entityId}`,
      dataKey,
    );

    // Encrypt each PII field
    const encryptedData: Record<string, string> = {};
    for (const [field, value] of Object.entries(piiData)) {
      const cipher = createCipheriv(this.algorithm, dataKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      encryptedData[field] = Buffer.concat([iv, authTag, encrypted]).toString(
        "base64",
      );
    }

    return { encryptedData, keyId };
  }

  // Delete key to "forget" data (GDPR erasure)
  async shredRecord(entityType: string, entityId: string): Promise<void> {
    await this.keyVault.deleteKey(`${entityType}-${entityId}`);
    // Mark record as shredded in database
    await this.prisma.$executeRaw`
      UPDATE "${entityType}"
      SET pii_shredded = true, pii_shredded_at = NOW()
      WHERE id = ${entityId}
    `;
  }
}
```

### Pattern 3: react-grid-layout Dashboard Builder

**What:** Drag-and-drop widget positioning with responsive breakpoints.
**When to use:** User-customizable dashboards with persistent layouts.

```typescript
// Source: react-grid-layout GitHub + AntStack tutorial
import GridLayout, { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  widgets: DashboardWidget[];
  layouts: ResponsiveLayouts;
  onLayoutChange: (layout: Layout[], layouts: ResponsiveLayouts) => void;
  isEditing: boolean;
}

export function DashboardBuilder({ widgets, layouts, onLayoutChange, isEditing }: DashboardBuilderProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={50}
      onLayoutChange={(_layout, allLayouts) => onLayoutChange(_layout, allLayouts)}
      isDraggable={isEditing}
      isResizable={isEditing}
      preventCollision={false}
      compactType="vertical"
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="widget-container">
          <WidgetRenderer widget={widget} />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
```

### Pattern 4: ClamAV Virus Scanning Integration

**What:** Scan uploaded files before storage using ClamAV daemon.
**When to use:** All file uploads (attachments, documents, imports).

```typescript
// Source: Transloadit tutorial + clamscan documentation
import NodeClam from "clamscan";

@Injectable()
export class VirusScanService {
  private clamav: NodeClam;
  private initialized = false;

  async onModuleInit() {
    this.clamav = await new NodeClam().init({
      clamdscan: {
        socket: "/var/run/clamav/clamd.ctl", // Local socket
        host: process.env.CLAMAV_HOST, // Or TCP host
        port: parseInt(process.env.CLAMAV_PORT || "3310"),
        timeout: 60000,
        localFallback: true,
      },
      preference: "clamdscan",
    });
    this.initialized = true;
  }

  async scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
    if (!this.initialized) {
      throw new Error("ClamAV not initialized");
    }

    const { isInfected, viruses } = await this.clamav.scanBuffer(buffer);

    return {
      clean: !isInfected,
      filename,
      threats: viruses || [],
      scannedAt: new Date(),
    };
  }
}
```

### Anti-Patterns to Avoid

- **Querying fact tables in real-time:** Use cached widget data service; fact tables are for pre-aggregation
- **Storing encryption keys in database:** Use Azure Key Vault; database compromise would expose keys
- **Synchronous virus scanning:** Scan asynchronously with BullMQ; don't block upload response
- **Full fact table rebuilds during business hours:** Schedule reconciliation for low-traffic periods (2 AM)
- **Mixing tenant data in benchmarking:** Always aggregate with organization_id grouping first

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                 | Don't Build           | Use Instead                               | Why                                                  |
| ----------------------- | --------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Cron expression parsing | Custom parser         | cron-parser (BullMQ dep)                  | Edge cases with timezones, DST                       |
| Drag-drop grid layout   | Custom with @dnd-kit  | react-grid-layout                         | Responsive breakpoints, collision detection built-in |
| Virus signatures        | Custom detection      | ClamAV                                    | Updated signatures, comprehensive malware database   |
| Key rotation            | Manual key management | Azure Key Vault                           | Automatic rotation, audit logging, compliance        |
| Date range aggregation  | Raw SQL               | PostgreSQL date_trunc + existing patterns | Timezone handling, consistency                       |

**Key insight:** The analytics domain has mature libraries for each component. Attempting to build custom solutions will miss edge cases (timezone handling, DST, responsive breakpoints, malware variants) that established libraries handle.

## Common Pitfalls

### Pitfall 1: Fact Table Drift

**What goes wrong:** Incremental updates miss edge cases, fact tables diverge from source truth over time.
**Why it happens:** Events missed during deployments, race conditions, partial failures.
**How to avoid:**

- Nightly full reconciliation job (2 AM) that rebuilds all facts
- Include `refreshed_at` timestamp in fact tables
- Add monitoring: alert if `refreshed_at` is >24h old
  **Warning signs:** Dashboard metrics don't match drill-down detail counts.

### Pitfall 2: Key Management Security

**What goes wrong:** Encryption keys exposed through logging, error messages, or database dumps.
**Why it happens:** Developers log key material for debugging, store keys in entity tables.
**How to avoid:**

- Keys ONLY in Azure Key Vault, never in PostgreSQL
- Entity stores only `piiEncryptionKeyId` (Key Vault reference)
- Audit log all key access via Key Vault's built-in auditing
- Never log decrypted PII values
  **Warning signs:** Keys appearing in application logs or error tracking.

### Pitfall 3: ClamAV Connection Failures

**What goes wrong:** File uploads fail when ClamAV daemon is down or unresponsive.
**Why it happens:** ClamAV daemon crashes, socket connection issues, timeout on large files.
**How to avoid:**

- Implement retry logic with exponential backoff
- Health check endpoint for ClamAV connectivity
- Configurable fallback behavior (reject or quarantine)
- Set appropriate timeout (60s for large files)
  **Warning signs:** Spike in upload failures correlated with server events.

### Pitfall 4: Peer Benchmarking Data Leakage

**What goes wrong:** Organization-identifiable data exposed in "anonymous" benchmarks.
**Why it happens:** Insufficient aggregation, unique combinations reveal identity.
**How to avoid:**

- Minimum threshold (e.g., 5+ organizations) for any benchmark cohort
- Aggregate to category/region level only, not specific values
- Remove outliers that could identify single organizations
- Never include organization_id in benchmark exports
  **Warning signs:** Users reporting they can identify competitors in benchmark data.

### Pitfall 5: react-grid-layout Performance

**What goes wrong:** Dashboard becomes sluggish with many widgets (15+) or during resize operations.
**Why it happens:** Layout recalculation on every resize event, no virtualization.
**How to avoid:**

- Debounce onLayoutChange callbacks (300ms)
- Lazy-load widget content (only load visible widgets)
- Use useMemo for layout calculations
- Limit dashboard to 20 widgets maximum
  **Warning signs:** Layout changes take >500ms to render.

## Code Examples

### Fact Table Prisma Model (FACT_CASE_DAILY)

```prisma
// Source: ANALYTICS-DATA-MODEL.md + incremental pattern
model FactCaseDaily {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  aggregationDate DateTime @map("aggregation_date") @db.Date

  // Dimensions
  categoryId      String?  @map("category_id")
  severityLevel   String?  @map("severity_level")
  sourceChannel   String?  @map("source_channel")
  locationId      String?  @map("location_id")
  businessUnitId  String?  @map("business_unit_id")

  // Metrics
  casesCreated    Int      @default(0) @map("cases_created")
  casesClosed     Int      @default(0) @map("cases_closed")
  casesOpen       Int      @default(0) @map("cases_open")
  avgDaysToClose  Float?   @map("avg_days_to_close")
  slaBreaches     Int      @default(0) @map("sla_breaches")

  // Metadata
  refreshedAt     DateTime @default(now()) @map("refreshed_at")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Indexes for common queries
  @@unique([organizationId, aggregationDate, categoryId, severityLevel, sourceChannel, locationId, businessUnitId], name: "fact_case_daily_unique")
  @@index([organizationId, aggregationDate])
  @@index([organizationId, categoryId])
  @@index([organizationId, severityLevel])
  @@map("fact_case_daily")
}
```

### BullMQ Scheduled Report Processor

```typescript
// Source: Existing export.processor.ts + BullMQ documentation
import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("scheduled-reports", { concurrency: 3 })
export class ScheduledReportProcessor extends WorkerHost {
  constructor(
    private readonly reportService: ReportExecutionService,
    private readonly mailerService: MailerService,
  ) {
    super();
  }

  async process(
    job: Job<ScheduledReportJobData>,
  ): Promise<{ success: boolean; fileUrl?: string }> {
    const { scheduleId, organizationId, reportId, recipients, format } =
      job.data;

    // Execute report
    const execution = await this.reportService.execute({
      reportId,
      organizationId,
      format,
      triggeredBy: "SCHEDULED",
      scheduleId,
    });

    if (execution.status !== "SUCCESS") {
      throw new Error(`Report execution failed: ${execution.errorMessage}`);
    }

    // Send email with attachment
    await this.mailerService.sendMail({
      to: recipients,
      subject: `Scheduled Report: ${execution.report.name}`,
      template: "scheduled-report",
      context: {
        reportName: execution.report.name,
        downloadUrl: execution.outputFileUrl,
      },
      attachments: [
        { filename: execution.outputFileName, path: execution.outputFilePath },
      ],
    });

    return { success: true, fileUrl: execution.outputFileUrl };
  }
}
```

### Data Retention Policy Configuration

```typescript
// Source: Platform patterns + GDPR requirements
interface RetentionPolicyConfig {
  entityType: "case" | "riu" | "disclosure" | "audit_log";
  defaultRetentionDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number | null; // null = never delete
  excludeStatuses?: string[]; // Don't archive/delete open items
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicyConfig[] = [
  {
    entityType: "case",
    defaultRetentionDays: 2555, // 7 years
    archiveAfterDays: 365, // Archive after 1 year
    deleteAfterDays: null, // Never delete (legal hold)
    excludeStatuses: ["NEW", "IN_INVESTIGATION", "PENDING_REMEDIATION"],
  },
  {
    entityType: "audit_log",
    defaultRetentionDays: 2555, // 7 years
    archiveAfterDays: 365,
    deleteAfterDays: null,
  },
  {
    entityType: "riu",
    defaultRetentionDays: 2555,
    archiveAfterDays: 365,
    deleteAfterDays: null,
  },
];
```

## State of the Art

| Old Approach                     | Current Approach                               | When Changed         | Impact                                           |
| -------------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------ |
| Materialized views for analytics | Event-driven fact tables + incremental updates | 2024                 | Better real-time freshness, lower DB load        |
| Delete PII directly              | Cryptographic shredding                        | 2020 (GDPR maturity) | Maintains audit trail, handles immutable records |
| Sync virus scanning on upload    | Async scan with quarantine                     | 2023                 | Better UX, handles large files                   |
| Custom drag-drop                 | react-grid-layout                              | Mature library       | Built-in responsive, collision detection         |

**Deprecated/outdated:**

- PostgreSQL REFRESH MATERIALIZED VIEW for real-time analytics (use event-driven incremental instead)
- Storing encryption keys in database columns (use Key Vault)
- Blocking virus scans on upload endpoint (use async queue)

## Open Questions

1. **ClamAV Deployment Model**
   - What we know: ClamAV can run as local daemon or separate container
   - What's unclear: Azure deployment preference (sidecar container vs separate service)
   - Recommendation: Start with sidecar container, can scale to separate service later

2. **Peer Benchmarking Consent**
   - What we know: Data must be anonymized and aggregated
   - What's unclear: Whether organizations must explicitly opt-in to benchmarking
   - Recommendation: Default to opt-in during implementation setup, make configurable

3. **Retention Policy Override Permissions**
   - What we know: Some organizations have legal holds requiring longer retention
   - What's unclear: Who can override default retention policies
   - Recommendation: System Admin only, with audit log

## Sources

### Primary (HIGH confidence)

- Existing codebase: `apps/backend/src/modules/analytics/` - Current dashboard/widget architecture
- Existing codebase: `apps/backend/src/modules/jobs/` - BullMQ patterns
- [ANALYTICS-DATA-MODEL.md](../../01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md) - Fact table specifications
- [BullMQ Official Documentation](https://docs.bullmq.io/guide/job-schedulers/repeat-strategies) - Cron/repeat strategies

### Secondary (MEDIUM confidence)

- [react-grid-layout GitHub](https://github.com/react-grid-layout/react-grid-layout) - API documentation
- [Transloadit ClamAV Tutorial](https://transloadit.com/devtips/implementing-server-side-malware-scanning-with-clamav-in-node-js/) - Node.js integration pattern
- [Thoughtworks Crypto-Shredding](https://www.thoughtworks.com/radar/techniques/crypto-shredding) - GDPR pattern
- [Medium: Crypto Shredding for Data Retention](https://medium.com/@brentrobinson5/crypto-shredding-how-it-can-solve-modern-data-retention-challenges-da874b01745b) - Implementation approach

### Tertiary (LOW confidence)

- [AntStack Dashboard Tutorial](https://www.antstack.com/blog/building-customizable-dashboard-widgets-using-react-grid-layout/) - react-grid-layout patterns (tutorial, verify current API)
- [Qrvey Multi-Tenant Analytics](https://qrvey.com/multi-tenant-analytics-platform/) - Benchmarking concepts

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Libraries already in codebase or well-documented
- Architecture: HIGH - Clear patterns from existing code + ANALYTICS-DATA-MODEL.md
- Pitfalls: MEDIUM - Based on general domain knowledge, not project-specific incidents

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable domain)

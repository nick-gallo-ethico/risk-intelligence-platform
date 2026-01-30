# Ralph Prompt: Case Management Module (Full Implementation)

You are implementing the complete Case Management module for the Risk Intelligence Platform.

## Context
- Reference: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- This is the foundation module - patterns established here are used everywhere
- Basic cases module exists at `apps/backend/src/modules/cases/`
- Need full feature implementation including investigations, findings, communications

## Current State
```bash
cd apps/backend && ls -la src/modules/cases/
cd apps/backend && cat src/modules/cases/cases.service.ts
cd apps/backend && cat prisma/schema.prisma | grep -A 50 "model Case"
```

## Requirements

### 1. Enhanced Case Schema

```prisma
model Case {
  id                String   @id @default(uuid())
  organizationId    String
  caseNumber        String   // Auto-generated: ORG-2026-0001

  // Classification
  status            CaseStatus @default(OPEN)
  statusRationale   String?    // AI-first: why this status
  severity          Severity   @default(MEDIUM)
  category          String
  subcategory       String?

  // Narrative context (AI-first)
  title             String
  description       String     // Full narrative for AI understanding
  aiSummary         String?
  aiSummaryGeneratedAt DateTime?
  aiModelVersion    String?

  // Reporter info
  reporterType      ReporterType @default(ANONYMOUS)
  reporterName      String?
  reporterEmail     String?
  reporterPhone     String?
  reporterEmployeeId String?

  // Source
  source            CaseSource
  sourceReference   String?    // Call ID, form submission ID, etc.

  // Location
  incidentDate      DateTime?
  incidentLocation  String?
  businessUnitId    String?
  regionId          String?

  // Routing
  assignedToId      String?
  assignedTo        User?      @relation("CaseAssignee", fields: [assignedToId], references: [id])
  queueId           String?

  // Flags
  isAnonymous       Boolean    @default(true)
  isRetaliationConcern Boolean @default(false)
  requiresUrgentReview Boolean @default(false)

  // Migration support
  sourceSystem      String?    // 'NAVEX', 'EQS', 'MANUAL'
  sourceRecordId    String?
  migratedAt        DateTime?

  // Timestamps
  receivedAt        DateTime   @default(now())
  closedAt          DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  createdById       String
  updatedById       String?

  // Relations
  investigations    Investigation[]
  interactions      Interaction[]
  communications    Communication[]
  subjects          CaseSubject[]
  attachments       Attachment[]
  activities        Activity[]

  @@unique([organizationId, caseNumber])
  @@index([organizationId, status])
  @@index([organizationId, assignedToId])
  @@index([organizationId, receivedAt])
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  PENDING_INFO
  UNDER_INVESTIGATION
  PENDING_REVIEW
  CLOSED
  ARCHIVED
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ReporterType {
  ANONYMOUS
  IDENTIFIED
  THIRD_PARTY
  SELF_REPORT
}

enum CaseSource {
  HOTLINE
  WEB_FORM
  EMAIL
  WALK_IN
  MANAGER_REPORT
  AUDIT_FINDING
  OTHER
}
```

### 2. Investigation Schema

```prisma
model Investigation {
  id                String   @id @default(uuid())
  organizationId    String
  caseId            String
  case              Case     @relation(fields: [caseId], references: [id])

  // Investigation details
  investigationNumber String  // CASE-INV-001
  status            InvestigationStatus @default(NOT_STARTED)
  priority          Priority @default(NORMAL)

  // Assignment
  leadInvestigatorId String?
  leadInvestigator  User?    @relation(fields: [leadInvestigatorId], references: [id])

  // Timeline
  startDate         DateTime?
  dueDate           DateTime?
  completedDate     DateTime?

  // Narrative (AI-first)
  scope             String?
  methodology       String?
  findings          String?
  conclusion        String?
  outcome           InvestigationOutcome?
  outcomeRationale  String?

  // Remediation
  remediationPlan   String?
  remediationStatus RemediationStatus?
  remediationDueDate DateTime?

  // Template
  templateId        String?
  checklistProgress Json?    // { completed: [], pending: [] }

  // AI enrichment
  aiSummary         String?
  aiSummaryGeneratedAt DateTime?
  aiModelVersion    String?

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String
  updatedById       String?

  // Relations
  interviews        Interview[]
  documents         InvestigationDocument[]

  @@unique([organizationId, investigationNumber])
  @@index([organizationId, caseId])
  @@index([leadInvestigatorId])
}

enum InvestigationStatus {
  NOT_STARTED
  IN_PROGRESS
  ON_HOLD
  PENDING_REVIEW
  COMPLETED
  CLOSED
}

enum InvestigationOutcome {
  SUBSTANTIATED
  UNSUBSTANTIATED
  INCONCLUSIVE
  PARTIALLY_SUBSTANTIATED
  REFERRED
}

enum RemediationStatus {
  NOT_REQUIRED
  PENDING
  IN_PROGRESS
  COMPLETED
  VERIFIED
}
```

### 3. Interaction & Communication Schemas

```prisma
model Interaction {
  id                String   @id @default(uuid())
  organizationId    String
  caseId            String
  case              Case     @relation(fields: [caseId], references: [id])

  type              InteractionType
  direction         Direction
  channel           String   // 'phone', 'email', 'in_person', 'portal'

  // Content
  subject           String?
  content           String
  aiSummary         String?

  // Participants
  participantName   String?
  participantRole   String?

  // Metadata
  occurredAt        DateTime
  duration          Int?     // minutes

  createdAt         DateTime @default(now())
  createdById       String

  @@index([organizationId, caseId])
}

model Communication {
  id                String   @id @default(uuid())
  organizationId    String
  caseId            String
  case              Case     @relation(fields: [caseId], references: [id])

  // Two-way messaging with reporter (via relay)
  direction         Direction
  channel           CommunicationChannel @default(PORTAL)

  subject           String?
  content           String
  isRead            Boolean  @default(false)
  readAt            DateTime?

  // For anonymous relay
  relayCode         String?  // One-time access code

  sentAt            DateTime @default(now())
  sentById          String?

  @@index([organizationId, caseId])
  @@index([relayCode])
}

enum InteractionType {
  INITIAL_INTAKE
  FOLLOW_UP
  INTERVIEW
  STATUS_UPDATE
  DOCUMENT_REQUEST
  CLOSURE_NOTIFICATION
}

enum Direction {
  INBOUND
  OUTBOUND
}

enum CommunicationChannel {
  PORTAL
  EMAIL
  SMS
}
```

### 4. Case Service Implementation
Update `apps/backend/src/modules/cases/cases.service.ts`:

- `create()` - Generate case number, log activity
- `findAll()` - Filter by org, support search/pagination
- `findOne()` - Include relations
- `update()` - Track changes, log activity
- `assignTo()` - Assign case, notify assignee
- `changeStatus()` - Validate transitions, log with rationale
- `addInteraction()` - Record follow-ups
- `sendCommunication()` - Two-way messaging
- `generateAISummary()` - Call AI service
- `search()` - Full-text search with filters

### 5. Investigation Service
Create `apps/backend/src/modules/investigations/`:
- investigation.service.ts
- investigation.controller.ts
- Full CRUD with assignment, findings, remediation tracking

### 6. Case Number Generation
```typescript
async generateCaseNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await this.prisma.case.count({
    where: {
      organizationId,
      caseNumber: { startsWith: `${year}-` },
    },
  });
  return `${year}-${String(count + 1).padStart(4, '0')}`;
}
```

### 7. Activity Logging
Every mutation must log:
```typescript
await this.activityService.log({
  entityType: 'CASE',
  entityId: case.id,
  action: 'status_changed',
  actionDescription: `${user.displayName} changed status from ${oldStatus} to ${newStatus}: "${rationale}"`,
  changes: { oldValue: { status: oldStatus }, newValue: { status: newStatus, rationale } },
  actorUserId: user.id,
  organizationId,
});
```

### 8. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="cases|investigation"
cd apps/backend && npm run typecheck
```

Test cases:
- Case creation generates unique number
- Status transitions validate properly
- Investigations link to cases
- Activity logged on all mutations
- Cross-tenant access blocked

## Verification Checklist
- [ ] Full Case schema with all fields
- [ ] Investigation schema with outcomes/remediation
- [ ] Interaction and Communication schemas
- [ ] CasesService with all operations
- [ ] InvestigationService complete
- [ ] Case number generation works
- [ ] Activity logging on all mutations
- [ ] AI summary generation works
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When full case management module is implemented:
<promise>CASE MANAGEMENT COMPLETE</promise>

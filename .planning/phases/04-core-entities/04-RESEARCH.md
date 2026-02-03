# Phase 4: Core Entities - Research

**Researched:** 2026-02-03
**Domain:** HubSpot-inspired data model: Person, RIU extensions, Case associations, Campaign targeting, labeled associations, pattern detection
**Confidence:** HIGH

## Summary

Phase 4 implements the HubSpot-inspired entity model that enables pattern detection and unified workflows across the Risk Intelligence Platform. The core entities are: Person (Contact equivalent), RIU extensions (Ticket equivalent with type-specific tables), Case (Deal equivalent with pipeline management), Campaign (Sequence equivalent for outbound requests), and labeled Associations that connect everything for pattern detection.

The key architectural insight is that **associations are first-class entities**, not just join tables. HubSpot's V4 Associations API demonstrates that labeled, typed associations with metadata enable powerful queries like "find all Cases involving this Person across different roles" or "show me all Cases where Person X was the subject and Person Y was the witness." This phase builds the foundation that Case Management, Campaigns, and Analytics depend on.

**Primary recommendation:** Implement associations as separate Prisma models with `label`, `status`, `validity_period`, and audit fields. Use denormalized association data in Elasticsearch indices for sub-second pattern detection queries. Follow existing codebase patterns (EventEmitter, ActivityService, per-tenant indices).

## Standard Stack

### Core Libraries

The phase uses the existing NestJS/Prisma stack established in Phase 1. No new major libraries required.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | 6.x | Database ORM | Already in use, type-safe queries |
| @nestjs/event-emitter | ^3.0.1 | Event-driven architecture | Already configured, enables loose coupling |
| @nestjs/elasticsearch | ^11.1.0 | Search indexing | Already configured for per-tenant indices |
| class-validator | ^0.14.x | DTO validation | Already in use for request validation |
| class-transformer | ^0.5.x | DTO transformation | Already in use |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^9.x | Reference number generation | Already in use for IDs |
| lodash | ^4.x | Utility functions (merge, deep clone) | Person merge operations |
| date-fns | ^3.x | Date manipulation | Validity periods, SLA calculations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate association tables | Polymorphic join table | Separate tables provide type safety, cleaner indexes, explicit foreign keys |
| Extension tables for RIU | JSONB custom fields | Extension tables enable database-level constraints, better query performance |
| Direct Prisma queries | Raw SQL | Prisma maintains type safety; raw SQL only for complex pattern detection queries |

**Installation:**
```bash
# No new packages required - all dependencies already in Phase 1
npm install  # Already installed
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/
├── persons/                      # Person entity (Contact equivalent)
│   ├── persons.module.ts
│   ├── persons.controller.ts
│   ├── persons.service.ts
│   ├── person-merge.service.ts   # Merge detection and execution
│   ├── dto/
│   │   ├── create-person.dto.ts
│   │   ├── update-person.dto.ts
│   │   └── merge-person.dto.ts
│   └── types/
│       └── person.types.ts
├── rius/                         # Enhanced RIU module
│   ├── rius.module.ts
│   ├── rius.controller.ts
│   ├── rius.service.ts
│   ├── riu-triage.service.ts     # Priority scoring, auto-routing
│   ├── extensions/               # Type-specific extension services
│   │   ├── hotline-riu.service.ts
│   │   ├── disclosure-riu.service.ts
│   │   └── web-form-riu.service.ts
│   └── dto/
│       ├── create-riu.dto.ts
│       └── triage-riu.dto.ts
├── campaigns/                    # Campaign entity (Sequence equivalent)
│   ├── campaigns.module.ts
│   ├── campaigns.controller.ts
│   ├── campaigns.service.ts
│   ├── targeting/
│   │   ├── segment.service.ts    # Dynamic audience segments
│   │   └── segment-query.builder.ts
│   ├── assignments/
│   │   └── campaign-assignment.service.ts
│   └── dto/
│       ├── create-campaign.dto.ts
│       └── segment-criteria.dto.ts
├── associations/                 # First-class association entities
│   ├── associations.module.ts
│   ├── person-case/
│   │   ├── person-case-association.service.ts
│   │   └── person-case-association.controller.ts
│   ├── person-riu/
│   │   ├── person-riu-association.service.ts
│   │   └── person-riu-association.controller.ts
│   ├── case-case/
│   │   ├── case-case-association.service.ts
│   │   └── case-case-association.controller.ts
│   ├── person-person/
│   │   ├── person-person-association.service.ts   # COI relationships
│   │   └── person-person-association.controller.ts
│   └── pattern-detection/
│       ├── pattern-detection.service.ts
│       └── pattern-detection.controller.ts
└── search/
    └── indexing/
        └── index-mappings/
            ├── case.mapping.ts    # Updated with associations
            ├── riu.mapping.ts
            └── person.mapping.ts
```

### Pattern 1: HubSpot-Style Labeled Associations

**What:** Associations are first-class entities with labels, status, and audit fields. Different association types use different status semantics.

**When to use:** Any relationship between entities that needs to be queried, filtered, or reported on.

**Example:**
```typescript
// Prisma schema - Person to Case association
model PersonCaseAssociation {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  personId        String   @map("person_id")
  caseId          String   @map("case_id")

  // Label defines the role
  label           PersonCaseLabel  // REPORTER, SUBJECT, WITNESS, INVESTIGATOR, etc.

  // Status for evidentiary associations (subject, witness, reporter)
  // Per CONTEXT.md: active, cleared, substantiated, withdrawn
  evidentiaryStatus    EvidentiaryStatus?  @map("evidentiary_status")
  evidentiaryStatusAt  DateTime?           @map("evidentiary_status_at")
  evidentiaryStatusBy  String?             @map("evidentiary_status_by")
  evidentiaryReason    String?             @map("evidentiary_reason")

  // Validity period for role associations (investigator, counsel)
  startedAt       DateTime   @default(now()) @map("started_at")
  endedAt         DateTime?  @map("ended_at")  // null = still active
  endedReason     String?    @map("ended_reason")

  // Notes
  notes           String?

  // Audit
  createdAt       DateTime @default(now()) @map("created_at")
  createdById     String   @map("created_by_id")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  person          Person       @relation(fields: [personId], references: [id])
  case            Case         @relation(fields: [caseId], references: [id])
  createdBy       User         @relation(fields: [createdById], references: [id])

  @@unique([organizationId, personId, caseId, label])
  @@index([organizationId])
  @@index([organizationId, personId])
  @@index([organizationId, caseId])
  @@index([organizationId, label])
  @@map("person_case_associations")
}

enum PersonCaseLabel {
  REPORTER
  SUBJECT
  WITNESS
  ASSIGNED_INVESTIGATOR
  APPROVER
  STAKEHOLDER
  MANAGER_OF_SUBJECT
  REVIEWER
  LEGAL_COUNSEL

  @@map("person_case_label")
}

enum EvidentiaryStatus {
  ACTIVE        // Investigation ongoing
  CLEARED       // Investigation complete, not substantiated
  SUBSTANTIATED // Investigation complete, substantiated
  WITHDRAWN     // Reporter withdrew, witness recanted

  @@map("evidentiary_status")
}
```

### Pattern 2: RIU Extension Tables

**What:** Base RIU table + type-specific extension tables for each RIU type. Enables database-level constraints and efficient queries.

**When to use:** RIU types with distinct field requirements (hotline vs web form vs disclosure).

**Example:**
```typescript
// Base RIU model (already exists, needs extension)
model RiskIntelligenceUnit {
  id                String @id @default(uuid())
  organizationId    String @map("organization_id")
  // ... existing fields ...

  // Extensions (0..1 of each type)
  hotlineExtension    RiuHotlineExtension?
  webFormExtension    RiuWebFormExtension?
  disclosureExtension RiuDisclosureExtension?
}

// Hotline-specific extension
model RiuHotlineExtension {
  id              String @id @default(uuid())
  riuId           String @unique @map("riu_id")
  organizationId  String @map("organization_id")

  // Hotline-specific fields
  callDuration        Int?      @map("call_duration")  // seconds
  interpreterUsed     Boolean   @default(false) @map("interpreter_used")
  interpreterLanguage String?   @map("interpreter_language")
  callerDemeanor      String?   @map("caller_demeanor")  // 'calm', 'distressed', 'angry'
  transferredFrom     String?   @map("transferred_from")  // phone number
  recordingUrl        String?   @map("recording_url")

  // QA workflow
  qaStatus            RiuQaStatus @default(PENDING) @map("qa_status")
  qaReviewerId        String?     @map("qa_reviewer_id")
  qaReviewedAt        DateTime?   @map("qa_reviewed_at")
  qaNotes             String?     @map("qa_notes")

  // Relations
  riu           RiskIntelligenceUnit @relation(fields: [riuId], references: [id], onDelete: Cascade)
  qaReviewer    User?                @relation(fields: [qaReviewerId], references: [id])

  @@index([organizationId])
  @@index([qaStatus])
  @@map("riu_hotline_extensions")
}

// Disclosure-specific extension
model RiuDisclosureExtension {
  id              String @id @default(uuid())
  riuId           String @unique @map("riu_id")
  organizationId  String @map("organization_id")

  // Disclosure-specific fields
  disclosureType      DisclosureType  @map("disclosure_type")  // COI, GIFT, OUTSIDE_EMPLOYMENT
  disclosureValue     Decimal?        @map("disclosure_value") @db.Decimal(12, 2)
  disclosureCurrency  String?         @map("disclosure_currency")
  thresholdTriggered  Boolean         @default(false) @map("threshold_triggered")
  conflictDetected    Boolean         @default(false) @map("conflict_detected")
  relatedPersonId     String?         @map("related_person_id")  // Who the conflict is with

  // Relations
  riu             RiskIntelligenceUnit @relation(fields: [riuId], references: [id], onDelete: Cascade)
  relatedPerson   Person?              @relation(fields: [relatedPersonId], references: [id])

  @@index([organizationId])
  @@index([disclosureType])
  @@map("riu_disclosure_extensions")
}
```

### Pattern 3: Person Merge with HubSpot Pattern

**What:** Suggest merge, user confirms. User picks winning value per field when conflicts exist.

**When to use:** When duplicate Person records are detected.

**Example:**
```typescript
// apps/backend/src/modules/persons/person-merge.service.ts

@Injectable()
export class PersonMergeService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private activityService: ActivityService,
  ) {}

  /**
   * Detect potential duplicates for a Person.
   * Returns candidates with match scores.
   */
  async detectDuplicates(
    personId: string,
    organizationId: string,
  ): Promise<PersonMergeCandidate[]> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    // Match on email (exact), name (fuzzy), phone (normalized)
    const candidates = await this.prisma.person.findMany({
      where: {
        organizationId,
        id: { not: personId },
        OR: [
          { email: person.email },  // Exact email match
          {
            AND: [
              { firstName: { contains: person.firstName, mode: 'insensitive' } },
              { lastName: { contains: person.lastName, mode: 'insensitive' } },
            ]
          },
        ],
      },
    });

    return candidates.map(candidate => ({
      personId: candidate.id,
      matchScore: this.calculateMatchScore(person, candidate),
      matchReasons: this.getMatchReasons(person, candidate),
    }));
  }

  /**
   * Merge two Person records.
   * @param primaryId - The record that survives
   * @param secondaryId - The record that becomes a tombstone
   * @param fieldResolutions - User's choices for conflicting fields
   */
  async merge(
    primaryId: string,
    secondaryId: string,
    fieldResolutions: PersonFieldResolutions,
    userId: string,
    organizationId: string,
  ): Promise<Person> {
    return this.prisma.$transaction(async (tx) => {
      const [primary, secondary] = await Promise.all([
        tx.person.findUnique({ where: { id: primaryId } }),
        tx.person.findUnique({ where: { id: secondaryId } }),
      ]);

      // 1. Update primary with resolved field values
      const mergedData = this.resolveFields(primary, secondary, fieldResolutions);
      const updatedPrimary = await tx.person.update({
        where: { id: primaryId },
        data: { ...mergedData, updatedById: userId },
      });

      // 2. Move all associations from secondary to primary
      await this.moveAssociations(tx, secondaryId, primaryId);

      // 3. Mark secondary as merged (tombstone)
      await tx.person.update({
        where: { id: secondaryId },
        data: {
          status: 'MERGED',
          mergedIntoPrimaryId: primaryId,
          mergedAt: new Date(),
          mergedById: userId,
        },
      });

      // 4. Log audit trail
      await this.activityService.log({
        entityType: 'PERSON',
        entityId: primaryId,
        action: 'merged',
        actionDescription: `Merged Person ${secondary.fullName} into ${primary.fullName}`,
        actorUserId: userId,
        organizationId,
        context: {
          secondaryPersonId: secondaryId,
          fieldResolutions,
          associationsMoved: true,
        },
      });

      return updatedPrimary;
    });
  }

  private async moveAssociations(
    tx: PrismaClient,
    fromPersonId: string,
    toPersonId: string,
  ): Promise<void> {
    // Move PersonCaseAssociations
    await tx.personCaseAssociation.updateMany({
      where: { personId: fromPersonId },
      data: { personId: toPersonId },
    });

    // Move PersonRiuAssociations
    await tx.personRiuAssociation.updateMany({
      where: { personId: fromPersonId },
      data: { personId: toPersonId },
    });

    // Move PersonPersonAssociations (both sides)
    await tx.personPersonAssociation.updateMany({
      where: { personAId: fromPersonId },
      data: { personAId: toPersonId },
    });
    await tx.personPersonAssociation.updateMany({
      where: { personBId: fromPersonId },
      data: { personBId: toPersonId },
    });
  }
}
```

### Pattern 4: Campaign Segment Query Builder

**What:** Dynamic audience builder with nested AND/OR conditions, saved as reusable segments.

**When to use:** Campaign targeting, defining who receives disclosure requests or attestations.

**Example:**
```typescript
// Segment criteria schema (stored as JSON)
interface SegmentCriteria {
  operator: 'AND' | 'OR';
  conditions: (SegmentCondition | SegmentCriteria)[];
}

interface SegmentCondition {
  field: string;           // 'businessUnitId', 'locationId', 'jobTitle', etc.
  operator: ConditionOperator;
  value: unknown;
}

type ConditionOperator =
  | 'equals' | 'notEquals'
  | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith'
  | 'greaterThan' | 'lessThan'
  | 'in' | 'notIn'
  | 'isNull' | 'isNotNull';

// apps/backend/src/modules/campaigns/targeting/segment-query.builder.ts

@Injectable()
export class SegmentQueryBuilder {
  /**
   * Build Prisma where clause from segment criteria.
   */
  buildWhereClause(
    criteria: SegmentCriteria,
    organizationId: string,
  ): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
      employmentStatus: 'ACTIVE',  // Only active employees
    };

    const criteriaWhere = this.buildCriteriaClause(criteria);
    return { AND: [where, criteriaWhere] };
  }

  private buildCriteriaClause(criteria: SegmentCriteria): Prisma.EmployeeWhereInput {
    const clauses = criteria.conditions.map(condition => {
      if ('operator' in condition && 'conditions' in condition) {
        // Nested criteria
        return this.buildCriteriaClause(condition);
      }
      // Leaf condition
      return this.buildConditionClause(condition as SegmentCondition);
    });

    if (criteria.operator === 'AND') {
      return { AND: clauses };
    } else {
      return { OR: clauses };
    }
  }

  private buildConditionClause(condition: SegmentCondition): Prisma.EmployeeWhereInput {
    const { field, operator, value } = condition;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'notEquals':
        return { [field]: { not: value } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'in':
        return { [field]: { in: value as string[] } };
      case 'notIn':
        return { [field]: { notIn: value as string[] } };
      case 'isNull':
        return { [field]: null };
      case 'isNotNull':
        return { [field]: { not: null } };
      // ... other operators
    }
  }

  /**
   * Preview segment audience with pagination.
   */
  async previewAudience(
    criteria: SegmentCriteria,
    organizationId: string,
    options: { limit: number; offset: number },
  ): Promise<{ employees: Employee[]; total: number }> {
    const where = this.buildWhereClause(criteria, organizationId);

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        take: options.limit,
        skip: options.offset,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { employees, total };
  }
}
```

### Pattern 5: Elasticsearch Association Denormalization

**What:** Store denormalized association data in ES indices for instant pattern detection queries.

**When to use:** Any search that needs to filter/facet by associations.

**Example:**
```typescript
// Case index mapping with associations
export const CASE_INDEX_MAPPING_V2 = {
  mappings: {
    properties: {
      // ... existing case fields ...

      // Denormalized associations for faceted search
      associations: {
        properties: {
          persons: {
            type: 'nested',
            properties: {
              personId: { type: 'keyword' },
              personName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              label: { type: 'keyword' },
              evidentiaryStatus: { type: 'keyword' },
            },
          },
          linkedRius: {
            type: 'nested',
            properties: {
              riuId: { type: 'keyword' },
              riuReferenceNumber: { type: 'keyword' },
              associationType: { type: 'keyword' },  // PRIMARY, RELATED, MERGED_FROM
            },
          },
          linkedCases: {
            type: 'nested',
            properties: {
              caseId: { type: 'keyword' },
              caseReferenceNumber: { type: 'keyword' },
              label: { type: 'keyword' },  // PARENT, CHILD, RELATED, etc.
            },
          },
        },
      },

      // Flattened for simple faceting
      personIds: { type: 'keyword' },
      subjectPersonIds: { type: 'keyword' },
      witnessPersonIds: { type: 'keyword' },
      reporterPersonIds: { type: 'keyword' },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      // ... existing analyzers ...
    },
  },
};

// Pattern detection query example
async function findCasesInvolvingPerson(
  personId: string,
  organizationId: string,
  roles?: PersonCaseLabel[],
): Promise<SearchResult> {
  const indexName = `org_${organizationId}_cases`;

  const query = {
    bool: {
      must: [
        {
          nested: {
            path: 'associations.persons',
            query: {
              bool: {
                must: [
                  { term: { 'associations.persons.personId': personId } },
                  ...(roles ? [{ terms: { 'associations.persons.label': roles } }] : []),
                ],
              },
            },
          },
        },
      ],
    },
  };

  return this.esService.search({
    index: indexName,
    query,
    aggs: {
      by_role: {
        nested: { path: 'associations.persons' },
        aggs: {
          roles: {
            filter: { term: { 'associations.persons.personId': personId } },
            aggs: {
              role_labels: { terms: { field: 'associations.persons.label' } },
            },
          },
        },
      },
    },
  });
}
```

### Anti-Patterns to Avoid

- **Generic polymorphic join table:** Don't use a single `associations` table with `source_type`, `target_type` columns. This loses type safety, makes queries complex, and prevents proper foreign keys.

- **Storing associations only in JSONB:** Don't store Person-Case links as JSON arrays on the Case record. This prevents efficient indexing, can't enforce referential integrity, and makes updates expensive.

- **Synchronous association updates in ES:** Don't update Elasticsearch synchronously when associations change. Use the existing event + job queue pattern for eventual consistency.

- **Skipping tombstone for merged Persons:** Don't delete the secondary Person record during merge. Mark as MERGED with a pointer to the primary - this preserves audit history and allows undo.

- **Hardcoding association labels:** Don't hardcode all labels in enums. Provide built-in labels + tenant-configurable custom labels.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate detection scoring | Custom fuzzy matching | Existing email match + Levenshtein for names | Edge cases (nicknames, typos, name changes) are complex |
| Segment query parsing | Custom query language | Prisma where clause builder from JSON | Type-safe, tested, maintains consistency with other queries |
| ES nested query building | String concatenation | `@elastic/elasticsearch` query builder | Escaping, nesting, aggregations all handled |
| Campaign audience snapshot | Manual employee list copy | `campaignAssignment` table with snapshotted data | Maintains relationship to Employee, tracks changes |
| Association permission check | Custom RBAC logic | Extend existing RolesGuard with association-type permissions | Consistent with codebase, audit-friendly |

**Key insight:** The existing codebase has patterns for events, audit logging, ES indexing, and permission guards. Extend these patterns rather than building parallel systems.

## Common Pitfalls

### Pitfall 1: Anonymous Person Placeholder Uniqueness

**What goes wrong:** Creating multiple "Anonymous Person" records that can't be linked for pattern detection.

**Why it happens:** Each anonymous RIU creates a new Person record with no identifying info.

**How to avoid:** Create a single "Anonymous Placeholder" Person per organization with `type: ANONYMOUS_PLACEHOLDER`. Link all anonymous RIUs to this placeholder. Pattern queries can then find "X anonymous reports" even though they can't identify the actual person.

**Warning signs:** Thousands of Person records with empty names and no associations except one RIU each.

### Pitfall 2: Association Status vs Validity Period Confusion

**What goes wrong:** Using `endedAt` for subject/witness associations when investigation closes, losing the permanent record.

**Why it happens:** Confusing "this person WAS a subject" (permanent historical fact) with "this person IS assigned as investigator" (can change).

**How to avoid:** Per CONTEXT.md decision:
- **Evidentiary associations** (subject, witness, reporter): Use `evidentiaryStatus` (active/cleared/substantiated/withdrawn). Never set `endedAt`.
- **Role associations** (investigator, counsel): Use `startedAt`/`endedAt` validity periods. Status not applicable.

**Warning signs:** Association queries missing historical subjects because they were "ended" when case closed.

### Pitfall 3: Campaign Audience Drift

**What goes wrong:** Mid-campaign employee additions/terminations cause inconsistent assignment lists.

**Why it happens:** Dynamic segment query returns different results each time.

**How to avoid:** Per CONTEXT.md decision, implement per-campaign configuration:
- **Closed:** Snapshot audience at launch, no changes
- **Open:** Auto-add new matches, adjust deadlines
- **Open with review:** Queue new matches for approval

Always store the launch-time snapshot in `campaignAssignment` records for audit trail.

**Warning signs:** Campaign completion percentage changes unexpectedly; new hires get retroactive assignments without adjusted deadlines.

### Pitfall 4: Circular Person-Person Associations

**What goes wrong:** A is spouse_of B, B is spouse_of A creates duplicate records or infinite loops.

**Why it happens:** Bidirectional relationships modeled as two unidirectional associations.

**How to avoid:** Store relationship once with canonical ordering (e.g., `personAId < personBId` alphabetically). Query in both directions. Include `direction` field if relationship is asymmetric (e.g., `manager_of` vs `reports_to`).

**Warning signs:** Duplicate relationship records; queries returning same relationship twice.

### Pitfall 5: Extension Table N+1 Queries

**What goes wrong:** Loading RIU list with extensions causes N+1 database queries.

**Why it happens:** Prisma eager loading not configured for optional relations.

**How to avoid:** Always include relevant extension in RIU queries:
```typescript
// Good
prisma.riskIntelligenceUnit.findMany({
  where: { type: 'HOTLINE_REPORT' },
  include: { hotlineExtension: true },
});

// Bad - loads extension separately for each RIU
rius.map(riu => prisma.riuHotlineExtension.findUnique({ where: { riuId: riu.id } }));
```

**Warning signs:** Slow RIU list page; database logs showing many small queries.

## Code Examples

### Person Entity with HRIS Integration

```typescript
// Prisma schema
model Person {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")

  // Type determines behavior
  type            PersonType  // EMPLOYEE, EXTERNAL_CONTACT, ANONYMOUS_PLACEHOLDER

  // Source tracking (per CONTEXT.md: hris_sync, manual, intake_created)
  source          PersonSource

  // Identity
  firstName       String?   @map("first_name")
  lastName        String?   @map("last_name")
  email           String?
  phone           String?

  // Employee-specific fields (populated when type = EMPLOYEE)
  employeeId      String?   @unique @map("employee_id")  // FK to Employee
  employee        Employee? @relation(fields: [employeeId], references: [id])

  // External contact fields
  company         String?
  title           String?
  relationship    String?   // 'vendor', 'contractor', 'customer', etc.

  // Anonymity tier (per CONTEXT.md: Anonymous / Confidential / Open)
  anonymityTier   AnonymityTier @default(OPEN) @map("anonymity_tier")

  // Status
  status          PersonStatus @default(ACTIVE)

  // Merge support
  mergedIntoPrimaryId  String?   @map("merged_into_primary_id")
  mergedAt             DateTime? @map("merged_at")
  mergedById           String?   @map("merged_by_id")

  // Audit
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")
  updatedById     String   @map("updated_by_id")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  caseAssociations    PersonCaseAssociation[]
  riuAssociations     PersonRiuAssociation[]
  personAAssociations PersonPersonAssociation[] @relation("PersonA")
  personBAssociations PersonPersonAssociation[] @relation("PersonB")

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([organizationId, type])
  @@index([organizationId, status])
  @@map("persons")
}

enum PersonType {
  EMPLOYEE           // Linked to HRIS Employee record
  EXTERNAL_CONTACT   // Vendor, contractor, customer, etc.
  ANONYMOUS_PLACEHOLDER  // Special record for anonymous reports

  @@map("person_type")
}

enum PersonSource {
  HRIS_SYNC        // Created/updated from HRIS integration
  MANUAL           // Manually created by user
  INTAKE_CREATED   // Auto-created during RIU intake

  @@map("person_source")
}

enum AnonymityTier {
  ANONYMOUS      // No identifying info shared with investigators
  CONFIDENTIAL   // Identity known to limited roles
  OPEN           // Identity visible to case team

  @@map("anonymity_tier")
}

enum PersonStatus {
  ACTIVE
  INACTIVE
  MERGED

  @@map("person_status")
}
```

### Campaign and Segment Models

```typescript
model Campaign {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")

  // Identity
  name            String
  description     String?
  campaignType    CampaignType @map("campaign_type")  // DISCLOSURE, ATTESTATION, SURVEY

  // Status
  status          CampaignStatus @default(DRAFT)

  // Scheduling
  launchAt        DateTime?  @map("launch_at")
  dueDate         DateTime   @map("due_date")
  reminderSchedule Json?     @map("reminder_schedule")  // Array of reminder configs

  // Targeting
  segmentId       String?    @map("segment_id")
  segment         Segment?   @relation(fields: [segmentId], references: [id])
  audienceMode    AudienceMode @default(CLOSED) @map("audience_mode")

  // Manual overrides (per CONTEXT.md)
  manualIncludes  String[]   @default([]) @map("manual_includes")  // Employee IDs
  manualExcludes  String[]   @default([]) @map("manual_excludes")  // Employee IDs

  // Linked form
  formDefinitionId String?   @map("form_definition_id")

  // Auto-case rules
  autoCaseThreshold  Json?   @map("auto_case_threshold")  // Conditions for auto-creating Case

  // Statistics (denormalized for dashboard)
  totalAssignments    Int @default(0) @map("total_assignments")
  completedCount      Int @default(0) @map("completed_count")
  overdueCount        Int @default(0) @map("overdue_count")

  // Audit
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")
  launchedAt      DateTime? @map("launched_at")
  launchedById    String?   @map("launched_by_id")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  assignments     CampaignAssignment[]

  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, campaignType])
  @@map("campaigns")
}

model Segment {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")

  name            String
  description     String?
  criteria        Json    // SegmentCriteria structure

  // Whether segment auto-updates
  isDynamic       Boolean @default(true) @map("is_dynamic")

  // Cached count (updated periodically)
  cachedCount     Int?    @map("cached_count")
  cachedAt        DateTime? @map("cached_at")

  // Audit
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  campaigns       Campaign[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("segments")
}

model CampaignAssignment {
  id              String @id @default(uuid())
  organizationId  String @map("organization_id")
  campaignId      String @map("campaign_id")
  employeeId      String @map("employee_id")

  // Status
  status          AssignmentStatus @default(PENDING)

  // Timing
  assignedAt      DateTime @default(now()) @map("assigned_at")
  dueDate         DateTime @map("due_date")  // May differ from campaign for late joins
  completedAt     DateTime? @map("completed_at")

  // Response
  riuId           String?  @map("riu_id")  // Created RIU when completed

  // Snapshot fields (for audit - values at assignment time)
  employeeNameSnapshot    String  @map("employee_name_snapshot")
  employeeDepartmentSnapshot String? @map("employee_department_snapshot")

  // Reminders sent
  remindersSent   Int @default(0) @map("reminders_sent")
  lastReminderAt  DateTime? @map("last_reminder_at")

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  campaign        Campaign     @relation(fields: [campaignId], references: [id])
  employee        Employee     @relation(fields: [employeeId], references: [id])
  riu             RiskIntelligenceUnit? @relation(fields: [riuId], references: [id])

  @@unique([campaignId, employeeId])
  @@index([organizationId])
  @@index([organizationId, campaignId])
  @@index([organizationId, employeeId])
  @@index([organizationId, status])
  @@index([organizationId, dueDate])
  @@map("campaign_assignments")
}

enum CampaignType {
  DISCLOSURE     // COI, gifts, outside employment
  ATTESTATION    // Policy acknowledgment
  SURVEY         // Compliance surveys

  @@map("campaign_type")
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED

  @@map("campaign_status")
}

enum AudienceMode {
  CLOSED         // Snapshot at launch
  OPEN           // Auto-add new matches
  OPEN_WITH_REVIEW  // Queue new matches for approval

  @@map("audience_mode")
}

enum AssignmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
  SKIPPED

  @@map("assignment_status")
}
```

### Pattern Detection Service

```typescript
// apps/backend/src/modules/associations/pattern-detection/pattern-detection.service.ts

@Injectable()
export class PatternDetectionService {
  constructor(
    private readonly esService: ElasticsearchService,
    private readonly indexingService: IndexingService,
  ) {}

  /**
   * Find all Cases where a Person appears, grouped by role.
   * This is the "wow moment" query for demos.
   */
  async getPersonInvolvementSummary(
    personId: string,
    organizationId: string,
  ): Promise<PersonInvolvementSummary> {
    const indexName = this.indexingService.getIndexName(organizationId, 'cases');

    const result = await this.esService.search({
      index: indexName,
      query: {
        nested: {
          path: 'associations.persons',
          query: {
            term: { 'associations.persons.personId': personId },
          },
        },
      },
      aggs: {
        person_roles: {
          nested: { path: 'associations.persons' },
          aggs: {
            matching_person: {
              filter: { term: { 'associations.persons.personId': personId } },
              aggs: {
                by_label: {
                  terms: { field: 'associations.persons.label' },
                  aggs: {
                    by_evidentiary_status: {
                      terms: { field: 'associations.persons.evidentiaryStatus' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      size: 0,  // Only aggregations, not hits
    });

    return this.formatInvolvementSummary(result.aggregations);
  }

  /**
   * Find Cases where multiple specific Persons are involved.
   * E.g., "Cases where Person A was subject AND Person B was witness"
   */
  async findCasesWithMultiplePersons(
    personCriteria: PersonCriteria[],
    organizationId: string,
    options: { limit: number; offset: number },
  ): Promise<PatternSearchResult> {
    const indexName = this.indexingService.getIndexName(organizationId, 'cases');

    const nestedQueries = personCriteria.map(criteria => ({
      nested: {
        path: 'associations.persons',
        query: {
          bool: {
            must: [
              { term: { 'associations.persons.personId': criteria.personId } },
              ...(criteria.labels ? [{ terms: { 'associations.persons.label': criteria.labels } }] : []),
            ],
          },
        },
      },
    }));

    const result = await this.esService.search({
      index: indexName,
      query: {
        bool: { must: nestedQueries },
      },
      from: options.offset,
      size: options.limit,
      sort: [{ createdAt: 'desc' }],
    });

    return {
      cases: result.hits.hits.map(hit => hit._source),
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total.value,
    };
  }

  /**
   * Generate "history alert" badge data for triage view.
   * Per CONTEXT.md: "3 previous reports from this person"
   */
  async getReporterHistory(
    personId: string,
    excludeRiuId: string,
    organizationId: string,
  ): Promise<ReporterHistoryBadge> {
    const riuIndexName = this.indexingService.getIndexName(organizationId, 'rius');

    const result = await this.esService.count({
      index: riuIndexName,
      query: {
        bool: {
          must: [
            {
              nested: {
                path: 'associations.persons',
                query: {
                  bool: {
                    must: [
                      { term: { 'associations.persons.personId': personId } },
                      { term: { 'associations.persons.label': 'REPORTER' } },
                    ],
                  },
                },
              },
            },
          ],
          must_not: [
            { term: { id: excludeRiuId } },
          ],
        },
      },
    });

    return {
      previousReportCount: result.count,
      showBadge: result.count > 0,
      badgeText: result.count === 1
        ? '1 previous report'
        : `${result.count} previous reports`,
    };
  }
}

interface PersonCriteria {
  personId: string;
  labels?: PersonCaseLabel[];
}

interface PatternSearchResult {
  cases: Case[];
  total: number;
}

interface ReporterHistoryBadge {
  previousReportCount: number;
  showBadge: boolean;
  badgeText: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic join tables | Typed association models with labels | HubSpot V4 (2023) | Enables role-specific queries and faceting |
| Single RIU table with JSONB | Extension tables per type | Industry best practice | Database-level constraints, better query performance |
| Hardcoded audience lists | Dynamic segments with query builder | Modern CRM standard | Reusable, auto-updating audiences |
| Manual duplicate review | Suggest + confirm merge pattern | HubSpot/Salesforce | Reduces false merges while improving efficiency |

**Deprecated/outdated:**
- Polymorphic `associations` table with `source_type`/`target_type` columns: Loses type safety and referential integrity
- Storing relationships in JSONB arrays: Can't index efficiently, no FK constraints

## Open Questions

1. **Custom Association Labels**
   - What we know: Built-in labels defined in enum + tenant-configurable custom labels
   - What's unclear: Should custom labels be stored in a separate `AssociationLabelConfig` table or in Organization settings JSON?
   - Recommendation: Use separate config table for proper indexing and validation; defer to implementation

2. **Person Merge Undo Scope**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Full undo (restore secondary Person + re-move associations) vs. audit-only
   - Recommendation: Implement audit-only for v1 (merge is logged, can be manually reversed by admin). Full undo is complex (what if associations changed since merge?) and rarely needed.

3. **RIU Attachment Handling Post-Creation**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Append-only after creation vs. frozen at intake
   - Recommendation: Append-only - allows adding supporting documents during investigation while preserving original intake.

## Sources

### Primary (HIGH confidence)
- [HubSpot Associations V4 API Documentation](https://developers.hubspot.com/docs/api-reference/crm-associations-v3/guide) - Association labels and types
- [HubSpot Association Labels Guide](https://knowledge.hubspot.com/object-settings/create-and-use-association-labels) - Label semantics and usage
- [NestJS Prisma Documentation](https://docs.nestjs.com/recipes/prisma) - Official integration patterns
- [Prisma Table Inheritance Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/table-inheritance) - Extension table patterns
- Existing codebase: `apps/backend/src/modules/cases/cases.service.ts` - Event patterns, audit logging
- Existing codebase: `apps/backend/src/modules/search/indexing/indexing.service.ts` - Per-tenant indexing
- Existing schema: `apps/backend/prisma/schema.prisma` - Current entity models

### Secondary (MEDIUM confidence)
- [Elasticsearch Faceted Search Tutorial](https://www.elastic.co/search-labs/tutorials/search-tutorial/full-text-search/facets) - Nested aggregations for associations
- [Dynamics 365 Duplicate Detection Guide (2026)](https://www.inogic.com/blog/2026/01/how-to-identify-duplicates-in-dynamics-365-crm-step-by-step-guide-2026/) - Merge best practices
- [CRM Deduplication Tutorial (2026)](https://www.breakcold.com/blog/crm-deduplication) - Detection patterns
- [NestJS Prisma Dynamic Filtering](https://medium.com/@davi_aquino/applying-filters-dynamically-with-nestjs-and-prisma-orm-bb8db455b32c) - Query builder patterns
- [API with NestJS: Polymorphic Associations](https://wanago.io/2024/02/19/api-nestjs-postgresql-prisma-polymorphic-associations/) - PostgreSQL patterns

### Tertiary (LOW confidence - needs validation)
- Community feedback on Prisma polymorphic associations: Pattern may evolve with Prisma updates

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new major libraries
- Architecture (associations): HIGH - Based on HubSpot V4 API design and existing schema patterns
- Architecture (campaigns): HIGH - Standard CRM segment pattern, existing form engine
- Pitfalls: MEDIUM - Based on CRM best practices and HubSpot documentation
- Pattern detection: HIGH - Elasticsearch nested queries are well-documented

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable patterns, existing codebase)

# Phase 6: Case Management - Research

**Researched:** 2026-02-03
**Domain:** Investigation workflows, templates, remediation tracking, anonymous communication, saved views
**Confidence:** HIGH

## Summary

Phase 6 builds upon the existing Case/Investigation/RIU entities from Phase 4 to deliver complete case lifecycle management. The codebase already has substantial foundation: Cases with pipeline stages, Investigations with status workflows, CaseMessages for anonymous communication, and Subject tracking. The research identifies that the primary new implementations are investigation templates (checklist system), remediation plans, saved views persistence, custom properties, and enhanced search.

The architecture should follow the existing patterns in the codebase: NestJS modules with services, Prisma models, event-driven indexing to Elasticsearch, and React frontend with Material-UI components. The investigation template system is the most complex new feature, requiring a tiered template model (Official/Team/Personal), versioning, conditional sections, and item-level evidence tracking.

**Primary recommendation:** Implement investigation templates as a new Prisma model with JSON-based checklist schema, following the existing WorkflowTemplate versioning pattern; build SavedView as a new generic entity supporting filter persistence across Cases, RIUs, and Investigations.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.x | Backend framework | Already in use, module-based architecture |
| Prisma | 5.x | ORM | Already in use, type-safe database access |
| PostgreSQL | 15+ | Database | Already in use, JSON support for flexible schemas |
| @nestjs/event-emitter | 2.x | Event bus | Already in use for async processing |
| BullMQ | 5.x | Job queues | Already in use for background jobs |
| Elasticsearch | 8.x | Search | Already in use with per-tenant indices |
| React 18 | 18.x | Frontend | Already in use |
| Material-UI | 5.x | UI components | Already in use (via shadcn patterns) |
| ProseMirror | Current | Rich text | Already integrated for notes |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 3.x | ID generation | Access codes, unique keys |
| date-fns | 2.x | Date handling | Timeline, SLA calculations |
| Ajv | 8.x | JSON Schema validation | Form/checklist validation |
| Zod | 3.x | Runtime validation | DTO validation |

### New for Phase 6
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hotkeys-hook | 4.x | Keyboard shortcuts | Global shortcuts (Cmd+K, etc.) |
| zustand | 4.x | State management | Saved views state (already may be in use) |
| react-beautiful-dnd | 13.x | Drag and drop | Checklist reordering (optional) |

**Installation:**
```bash
npm install react-hotkeys-hook
```

## Architecture Patterns

### Recommended Module Structure
```
apps/backend/src/modules/
├── investigations/           # Existing - enhance
│   ├── investigations.service.ts
│   ├── templates/           # NEW: Investigation templates
│   │   ├── template.service.ts
│   │   ├── template-assignment.service.ts
│   │   └── template-analytics.service.ts
│   ├── interviews/          # NEW: Structured interviews
│   │   ├── interview.service.ts
│   │   └── interview-questions.service.ts
│   ├── checklists/          # NEW: Checklist progress
│   │   ├── checklist.service.ts
│   │   └── checklist-item.service.ts
│   └── dto/
├── remediation/             # NEW: Remediation plans
│   ├── remediation.module.ts
│   ├── remediation.service.ts
│   ├── remediation-step.service.ts
│   ├── remediation-notification.service.ts
│   └── dto/
├── messaging/               # Enhance existing CaseMessage
│   ├── messaging.module.ts
│   ├── messaging.service.ts
│   ├── relay.service.ts     # NEW: Anonymous relay
│   └── pii-detection.service.ts
├── saved-views/             # NEW: Saved views infrastructure
│   ├── saved-views.module.ts
│   ├── saved-views.service.ts
│   └── dto/
├── custom-properties/       # NEW: Tenant-configurable fields
│   ├── custom-properties.module.ts
│   ├── custom-properties.service.ts
│   └── dto/
└── search/                  # Enhance existing
    └── unified-search.service.ts
```

### Pattern 1: Investigation Template Model
**What:** Templates stored as versioned JSON schemas with metadata
**When to use:** Investigation checklist definitions
**Example:**
```typescript
// Prisma model
model InvestigationTemplate {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")

  // Identity
  name            String
  description     String?
  categoryId      String?  @map("category_id")  // Optional category binding

  // Template tier
  tier            TemplateTier  @default(PERSONAL)  // OFFICIAL, TEAM, PERSONAL
  createdById     String   @map("created_by_id")
  sharedWithTeamId String? @map("shared_with_team_id")

  // Versioning (same pattern as WorkflowTemplate)
  version         Int      @default(1)
  isActive        Boolean  @default(true)  @map("is_active")
  isArchived      Boolean  @default(false) @map("is_archived")

  // Schema (JSON)
  sections        Json     // Array of ChecklistSection
  suggestedDurations Json? @map("suggested_durations")
  conditionalRules Json?   @map("conditional_rules")

  // Import/Export
  isSystemTemplate Boolean @default(false) @map("is_system_template")
  sourceTemplateId String? @map("source_template_id")

  // Analytics tracking
  usageCount      Int      @default(0) @map("usage_count")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, name, version])
  @@index([organizationId, tier])
  @@index([organizationId, categoryId])
  @@map("investigation_templates")
}

// JSON Schema for sections
interface ChecklistSection {
  id: string;
  name: string;
  order: number;
  suggestedDays?: number;
  sectionDependencies?: string[];  // Section IDs that must complete first
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  guidance?: string;  // "Why this matters" expandable content
  dependencies?: string[];  // Item IDs that must complete first
  conditionalRules?: ConditionalRule[];  // Show/hide based on case properties
}
```

### Pattern 2: Checklist Progress Tracking
**What:** Track per-investigation checklist completion with evidence
**When to use:** Investigation checklist state
**Example:**
```typescript
// Prisma model for checklist progress
model InvestigationChecklistProgress {
  id              String   @id @default(uuid())
  investigationId String   @map("investigation_id")
  organizationId  String   @map("organization_id")
  templateId      String   @map("template_id")
  templateVersion Int      @map("template_version")

  // Current state (JSON for flexibility)
  itemStates      Json     @map("item_states")  // { [itemId]: ChecklistItemState }
  sectionStates   Json     @map("section_states")  // { [sectionId]: SectionState }

  // Customizations (investigator changes)
  customItems     Json?    @map("custom_items")  // Items added by investigator
  skippedItems    Json?    @map("skipped_items")  // Items marked N/A
  itemOrder       Json?    @map("item_order")  // Custom ordering

  // Summary metrics (denormalized for queries)
  totalItems      Int      @map("total_items")
  completedItems  Int      @default(0) @map("completed_items")
  skippedCount    Int      @default(0) @map("skipped_count")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([investigationId])
  @@index([organizationId, templateId])
  @@map("investigation_checklist_progress")
}

interface ChecklistItemState {
  status: 'pending' | 'completed' | 'skipped';
  completedAt?: string;
  completedById?: string;
  completionNotes?: string;
  attachmentIds?: string[];
  linkedInterviewIds?: string[];
}
```

### Pattern 3: Remediation Plan Model
**What:** Finding-linked remediation with step tracking
**When to use:** Post-investigation remediation tracking
**Example:**
```typescript
model RemediationPlan {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  caseId          String   @map("case_id")

  // Link to specific finding (not just case)
  findingId       String?  @map("finding_id")  // Optional FK to CaseFinding
  findingDescription String? @map("finding_description")

  // Template (optional)
  templateId      String?  @map("template_id")
  templateVersion Int?     @map("template_version")

  // Status
  status          RemediationStatus @default(DRAFT)
  dueDate         DateTime? @map("due_date")
  completedAt     DateTime? @map("completed_at")

  // Summary
  totalSteps      Int      @default(0) @map("total_steps")
  completedSteps  Int      @default(0) @map("completed_steps")

  createdById     String   @map("created_by_id")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, caseId])
  @@index([organizationId, status])
  @@map("remediation_plans")
}

model RemediationStep {
  id              String   @id @default(uuid())
  planId          String   @map("plan_id")
  organizationId  String   @map("organization_id")

  // Step details
  order           Int
  title           String
  description     String?
  dueDate         DateTime? @map("due_date")

  // Assignment (user OR external contact)
  assigneeUserId  String?  @map("assignee_user_id")
  assigneeEmail   String?  @map("assignee_email")  // For non-users
  assigneeName    String?  @map("assignee_name")

  // Completion
  status          StepStatus @default(PENDING)
  requiresCoApproval Boolean @default(false) @map("requires_co_approval")
  completedAt     DateTime? @map("completed_at")
  completedById   String?  @map("completed_by_id")
  completionNotes String?  @map("completion_notes")
  approvedById    String?  @map("approved_by_id")
  approvedAt      DateTime? @map("approved_at")

  // Dependencies
  dependsOnStepIds String[] @default([]) @map("depends_on_step_ids")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([planId])
  @@index([organizationId, assigneeUserId])
  @@index([organizationId, status, dueDate])
  @@map("remediation_steps")
}
```

### Pattern 4: Saved Views Infrastructure
**What:** User-persisted filter configurations
**When to use:** Case list, RIU list, Investigation list saved filters
**Example:**
```typescript
model SavedView {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")

  // Ownership
  createdById     String   @map("created_by_id")
  isShared        Boolean  @default(false) @map("is_shared")
  sharedWithTeamId String? @map("shared_with_team_id")

  // View definition
  name            String
  entityType      ViewEntityType  // CASES, RIUS, INVESTIGATIONS, etc.
  filters         Json     // Filter configuration
  sortBy          String?  @map("sort_by")
  sortOrder       String?  @map("sort_order")
  columns         Json?    // Column visibility/order

  // User preferences
  isDefault       Boolean  @default(false) @map("is_default")
  isPinned        Boolean  @default(false) @map("is_pinned")
  displayOrder    Int      @default(0) @map("display_order")

  // Usage tracking
  lastUsedAt      DateTime? @map("last_used_at")
  useCount        Int      @default(0) @map("use_count")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, createdById])
  @@index([organizationId, entityType])
  @@map("saved_views")
}
```

### Pattern 5: Custom Properties (Tenant-Configurable Fields)
**What:** Organization-defined fields on entities
**When to use:** Tenant customization without schema changes
**Example:**
```typescript
model CustomPropertyDefinition {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")

  // Target entity
  entityType      CustomPropertyEntityType  // CASE, INVESTIGATION, PERSON

  // Property definition
  name            String
  key             String   // Unique key within entity type
  description     String?

  // Type and validation
  dataType        PropertyDataType  // TEXT, NUMBER, DATE, SELECT, MULTI_SELECT, BOOLEAN
  isRequired      Boolean  @default(false) @map("is_required")
  defaultValue    Json?    @map("default_value")
  options         Json?    // For SELECT/MULTI_SELECT: [{value, label}]
  validationRules Json?    @map("validation_rules")

  // Display
  displayOrder    Int      @default(0) @map("display_order")
  groupName       String?  @map("group_name")
  isVisible       Boolean  @default(true) @map("is_visible")

  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, entityType, key])
  @@index([organizationId, entityType])
  @@map("custom_property_definitions")
}

// Values stored in entity's customFields JSON column (already exists on Case)
// Structure: { [propertyKey]: value }
```

### Anti-Patterns to Avoid
- **Separate tables per checklist item:** Use JSON for checklist schemas - too much overhead for individual rows
- **Inline template modifications:** Always version templates; never modify in-place when instances exist
- **Tight coupling to categories:** Templates can suggest categories but shouldn't require exact match
- **Synchronous external notifications:** Use BullMQ jobs for remediation step email notifications
- **Per-field custom property tables:** Use JSON columns with validation; schema-per-field doesn't scale

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checklist validation | Custom validator | Ajv with JSON Schema | Already in codebase, handles nested conditionals |
| Rich text in notes | Custom editor | ProseMirror (existing) | Already integrated with cleanup |
| Activity timeline | Custom component | Extend CaseActivityTimeline | Already built, needs minor enhancement |
| File attachments | New storage | ModuleStorageService | Already handles per-entity polymorphic attachments |
| Search across entities | Custom queries | SearchService | Already supports multi-entity search |
| Event emission | Direct calls | EventEmitter2 | Already wired for async handlers |
| Job scheduling | setTimeout | BullMQ | Already configured with retry logic |
| Access code generation | Custom function | nanoid (existing pattern) | Already used for RIU access codes |

**Key insight:** Phase 6 is primarily about orchestrating existing infrastructure (storage, search, events, forms) into new domain models rather than building new foundational capabilities.

## Common Pitfalls

### Pitfall 1: Template Version Mismatch
**What goes wrong:** Investigation using template v1 shows items from v2 after template update
**Why it happens:** Not snapshotting template version at investigation creation
**How to avoid:** Store templateVersion on InvestigationChecklistProgress; never dynamically load template
**Warning signs:** "Items disappeared" or "new items appeared" bug reports

### Pitfall 2: Anonymous Message Identity Leak
**What goes wrong:** Investigator sees reporter email/phone in message thread
**Why it happens:** Joining CaseMessage with RIU.reporterEmail without filtering
**How to avoid:** Create RelayService that explicitly strips PII; never expose RIU contact fields to Case viewers
**Warning signs:** Review all CaseMessage queries for RIU joins

### Pitfall 3: Saved View Filter Drift
**What goes wrong:** Saved view shows wrong results after adding new filter options
**Why it happens:** Filters reference enum values that change or are removed
**How to avoid:** Validate filter values on load; gracefully handle unknown values
**Warning signs:** Empty results from previously working saved views

### Pitfall 4: Remediation Step Circular Dependencies
**What goes wrong:** Step A depends on B, B depends on A - deadlock
**Why it happens:** No validation of dependency graph
**How to avoid:** Validate DAG (directed acyclic graph) when saving dependencies
**Warning signs:** Steps permanently locked; "waiting for prerequisite" that never clears

### Pitfall 5: Custom Property Search Inconsistency
**What goes wrong:** Searching custom field returns stale results
**Why it happens:** Custom fields stored in JSONB but not indexed in Elasticsearch
**How to avoid:** Re-index entity when custom properties change; include customFields in ES mapping
**Warning signs:** "Just updated field but search doesn't find it"

### Pitfall 6: Checklist Completion Evidence Loss
**What goes wrong:** Evidence notes submitted but not visible later
**Why it happens:** Race condition between completion and evidence upload; transaction scope
**How to avoid:** Use Prisma transaction for completion + evidence together
**Warning signs:** "I added notes but they're gone" reports

## Code Examples

Verified patterns from official sources:

### Keyboard Shortcuts with react-hotkeys-hook
```typescript
// Source: react-hotkeys-hook documentation
import { useHotkeys } from 'react-hotkeys-hook';

function CaseList() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Global search: Cmd+K (Mac) / Ctrl+K (Windows)
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setSearchOpen(true);
  }, { enableOnFormTags: false });

  // Create new case: Cmd+N
  useHotkeys('mod+n', (e) => {
    e.preventDefault();
    router.push('/cases/new');
  });

  // Navigate to next item: J
  useHotkeys('j', () => focusNext());

  // Navigate to previous item: K
  useHotkeys('k', () => focusPrevious());
}
```

### Saved View Filter Persistence
```typescript
// Service pattern for saved views
@Injectable()
export class SavedViewsService {
  async createView(
    organizationId: string,
    userId: string,
    dto: CreateSavedViewDto,
  ): Promise<SavedView> {
    // Validate filter values against current enum definitions
    const validatedFilters = await this.validateFilters(
      dto.entityType,
      dto.filters,
    );

    return this.prisma.savedView.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        entityType: dto.entityType,
        filters: validatedFilters,
        sortBy: dto.sortBy,
        sortOrder: dto.sortOrder,
        columns: dto.columns,
      },
    });
  }

  async applyView(
    organizationId: string,
    viewId: string,
    userId: string,
  ): Promise<{ filters: Record<string, unknown>; invalid: string[] }> {
    const view = await this.prisma.savedView.findFirst({
      where: { id: viewId, organizationId },
    });

    if (!view) throw new NotFoundException('View not found');

    // Track usage
    await this.prisma.savedView.update({
      where: { id: viewId },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });

    // Validate filters are still valid (enums may have changed)
    const { valid, invalid } = await this.validateFilters(
      view.entityType,
      view.filters as Record<string, unknown>,
    );

    return { filters: valid, invalid };
  }
}
```

### Anonymous Message Relay Pattern
```typescript
// Relay service that strips identity
@Injectable()
export class MessageRelayService {
  async sendToReporter(
    caseId: string,
    investigatorId: string,
    content: string,
    organizationId: string,
  ): Promise<CaseMessage> {
    // Create outbound message
    const message = await this.prisma.caseMessage.create({
      data: {
        organizationId,
        caseId,
        direction: 'OUTBOUND',
        senderType: 'INVESTIGATOR',
        content,
        createdById: investigatorId,
      },
    });

    // Get RIU to find delivery method (never expose to investigator)
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        riuAssociations: {
          where: { associationType: 'PRIMARY' },
          include: { riu: true },
        },
      },
    });

    const primaryRiu = caseRecord?.riuAssociations[0]?.riu;

    // Check if reporter opted in for email notifications
    if (primaryRiu?.reporterEmail && this.hasOptedForNotifications(primaryRiu)) {
      // Queue email notification (content only, no investigator identity)
      await this.jobQueue.add('notify-reporter', {
        riuId: primaryRiu.id,
        messageId: message.id,
        accessCode: primaryRiu.anonymousAccessCode,
      });
    }

    return message;
  }

  // PII detection before sending
  async checkForPii(content: string): Promise<PiiDetectionResult> {
    // Simple pattern matching for common PII
    const patterns = {
      email: /\b[\w.-]+@[\w.-]+\.\w+\b/gi,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      date: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}\b/gi,
    };

    const detected: string[] = [];
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        detected.push(type);
      }
    }

    return {
      hasPii: detected.length > 0,
      types: detected,
      warning: detected.length > 0
        ? `Message may contain personal information: ${detected.join(', ')}`
        : null,
    };
  }
}
```

### Investigation Template Assignment
```typescript
// Auto-assign template by category
@Injectable()
export class TemplateAssignmentService {
  async getTemplateForCase(
    organizationId: string,
    categoryId: string | null,
  ): Promise<{ template: InvestigationTemplate | null; requirement: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' }> {
    // Check category-to-template mapping
    if (categoryId) {
      const mapping = await this.prisma.categoryTemplateMapping.findFirst({
        where: { organizationId, categoryId, isActive: true },
        include: { template: true },
      });

      if (mapping) {
        return {
          template: mapping.template,
          requirement: mapping.requirement,
        };
      }
    }

    // Fall back to default template
    const defaultTemplate = await this.prisma.investigationTemplate.findFirst({
      where: {
        organizationId,
        isActive: true,
        tier: 'OFFICIAL',
        isDefault: true,
      },
    });

    return {
      template: defaultTemplate,
      requirement: 'OPTIONAL',
    };
  }

  async applyTemplate(
    investigationId: string,
    templateId: string,
    organizationId: string,
    userId: string,
  ): Promise<InvestigationChecklistProgress> {
    const template = await this.prisma.investigationTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) throw new NotFoundException('Template not found');

    // Initialize checklist progress with all items pending
    const sections = template.sections as ChecklistSection[];
    const itemStates: Record<string, ChecklistItemState> = {};
    const sectionStates: Record<string, SectionState> = {};
    let totalItems = 0;

    for (const section of sections) {
      sectionStates[section.id] = { status: 'pending', completedItems: 0 };
      for (const item of section.items) {
        itemStates[item.id] = { status: 'pending' };
        totalItems++;
      }
    }

    return this.prisma.investigationChecklistProgress.create({
      data: {
        investigationId,
        organizationId,
        templateId: template.id,
        templateVersion: template.version,
        itemStates,
        sectionStates,
        totalItems,
      },
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic checklist | Section-based with progress tracking | 2024+ | Better UX for complex investigations |
| Per-user local storage filters | Server-side saved views | 2024+ | Cross-device, shareable filters |
| Rigid workflow enforcement | Flexible templates with suggestions | 2024+ | Investigators can adapt to case needs |
| Manual email tracking | Integrated anonymous relay | 2024+ | Audit trail, compliance |
| Hard-coded entity fields | Custom properties | 2024+ | Tenant customization without code |

**Deprecated/outdated:**
- **LocalStorage for filter persistence:** Use server-side SavedViews for sharing and cross-device
- **Investigation without template:** Templates now standard for audit trail; even "General" template
- **Single-level checklists:** Section grouping is now expected for usability

## Open Questions

Things that couldn't be fully resolved:

1. **Template Upgrade Conflict Resolution**
   - What we know: User decided completed items preserved during upgrade
   - What's unclear: Exact merge strategy when item text changed vs item removed
   - Recommendation: Show diff dialog; preserve completion state if item ID matches

2. **External Contact Verification**
   - What we know: External contacts receive email with task details
   - What's unclear: How to verify completion without system account
   - Recommendation: Signed one-time link for completion confirmation; CO marks complete manually

3. **Saved View Sharing Permissions**
   - What we know: Views can be shared with team
   - What's unclear: Can shared views be modified by recipients?
   - Recommendation: Shared views are read-only; recipients can "Save as copy" to customize

4. **AI Summary in Checklist Context**
   - What we know: AI can suggest completion notes based on recent activity (Claude's discretion)
   - What's unclear: Exact prompt engineering for context extraction
   - Recommendation: Defer AI integration to Phase 5 completion; stub with manual-only initially

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/backend/prisma/schema.prisma` - Existing entity patterns
- Codebase analysis: `apps/backend/src/modules/workflow/workflow.service.ts` - Template versioning
- Codebase analysis: `apps/backend/src/modules/search/search.service.ts` - Unified search
- Codebase analysis: `apps/backend/src/modules/storage/storage.service.ts` - Attachment handling
- Codebase analysis: `apps/frontend/src/components/cases/case-activity-timeline.tsx` - Timeline UI

### Secondary (MEDIUM confidence)
- MUI X Data Grid Accessibility docs - Keyboard navigation patterns
- Material React Table V3 docs - enableKeyboardShortcuts pattern
- React-Admin Enterprise (ra-audit-log) - Activity timeline patterns
- nestjs-query documentation - Filter/query patterns

### Tertiary (LOW confidence)
- WebSearch: Anonymous messaging relay patterns - General architecture guidance
- WebSearch: Saved views React patterns - Confirmed server-side approach preferred

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against existing codebase
- Architecture: HIGH - Follows established patterns in codebase
- Pitfalls: HIGH - Based on common compliance software issues
- Template system: MEDIUM - Novel implementation, patterns extrapolated from WorkflowTemplate
- Anonymous relay: MEDIUM - CaseMessage exists, relay logic is new

**Research date:** 2026-02-03
**Valid until:** 30 days (stable domain, enterprise patterns)

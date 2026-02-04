# Phase 9: Campaigns & Disclosures - Research

**Researched:** 2026-02-04
**Domain:** Compliance disclosure management, campaign automation, threshold detection, conflict analysis
**Confidence:** HIGH (substantial existing infrastructure to build upon)

## Summary

This phase enables outbound compliance campaigns including COI disclosures, gift tracking, outside employment declarations, attestations, and related workflows. The research reveals strong existing infrastructure from Phase 4 (Campaign, CampaignAssignment, RiuDisclosureExtension entities), Phase 7 (notification system), and Phase 8 (Employee Portal).

The primary implementation work involves:
1. **Disclosure form templates** - Leveraging existing Form/Schema engine with specialized templates for each disclosure type
2. **Threshold-based auto-case creation** - Building rule evaluation service using existing Campaign.caseCreationThreshold JSON field
3. **Conflict detection service** - Cross-referencing disclosure history with network analysis patterns
4. **Approval workflows** - Integrating with existing WorkflowTemplate/WorkflowInstance infrastructure
5. **Campaign dashboard** - Completion tracking with visualization patterns

**Primary recommendation:** Build disclosure-specific services on top of existing Campaign infrastructure. Use the established Form engine for disclosure forms, the DisclosureRiuService for threshold/conflict tracking, and extend the notification system for campaign reminders.

## Standard Stack

The project already has the established stack. Phase 9 uses existing infrastructure:

### Core (Already Exists - Use As-Is)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.x | Backend framework | Already in use, provides DI, modules |
| Prisma | 5.x | ORM | Already in use, handles RLS |
| Next.js | 14.x | Frontend framework | Already in use with App Router |
| shadcn/ui | latest | UI components | Already in use, consistent styling |
| react-hook-form | 7.x | Form management | Industry standard for React forms |
| Ajv | 8.x | JSON Schema validation | Already in use by Form engine |

### Supporting (New for Phase 9)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json-rules-engine | 6.x | Rule evaluation | Threshold and auto-case rules |
| recharts | 2.x | Dashboard charts | Campaign completion visualizations |
| date-fns | 3.x | Date manipulation | Due date calculations, reminders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| json-rules-engine | Custom if/else logic | Use library for maintainability and auditability |
| recharts | Nivo, Victory | shadcn/ui patterns align better with recharts |

**Installation:**
```bash
npm install json-rules-engine recharts
```

## Architecture Patterns

### Recommended Module Structure
```
apps/backend/src/modules/
├── campaigns/                    # Existing - extend
│   ├── dto/
│   │   └── disclosure-form.dto.ts    # NEW: Disclosure-specific DTOs
│   ├── disclosure/                    # NEW: Disclosure sub-module
│   │   ├── disclosure-form.service.ts
│   │   ├── disclosure-submission.service.ts
│   │   ├── threshold.service.ts
│   │   └── conflict-detection.service.ts
│   ├── assignments/
│   │   └── campaign-assignment.service.ts  # Existing - extend
│   ├── dashboard/                     # NEW: Dashboard sub-module
│   │   └── campaign-dashboard.service.ts
│   └── targeting/
│       └── segment.service.ts         # Existing
├── rius/
│   └── extensions/
│       └── disclosure-riu.service.ts  # Existing - extend
└── workflows/                         # Use existing for approvals
```

### Pattern 1: Disclosure Form Template Pattern
**What:** Pre-configured JSON Schema templates for each disclosure type (COI, GIFT, OUTSIDE_EMPLOYMENT)
**When to use:** When creating campaign-linked disclosure forms
**Example:**
```typescript
// Disclosure form templates inherit from FormDefinition
// Store as FormType.DISCLOSURE with disclosureType in metadata

const coiFormSchema: FormSchema = {
  type: 'object',
  required: ['disclosureType', 'description', 'relatedParty'],
  properties: {
    disclosureType: { type: 'string', const: 'COI' },
    description: {
      type: 'string',
      title: 'Nature of Conflict',
      minLength: 20
    },
    relatedParty: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        relationship: {
          type: 'string',
          enum: ['family', 'business_partner', 'vendor', 'other']
        },
        company: { type: 'string' }
      }
    },
    financialInterest: {
      type: 'object',
      properties: {
        hasFinancialInterest: { type: 'boolean' },
        estimatedValue: { type: 'number' },
        currency: { type: 'string', default: 'USD' }
      }
    }
  }
};
```

### Pattern 2: Threshold Rule Engine Pattern
**What:** JSON-based rules evaluated against disclosure values to trigger auto-case creation
**When to use:** When disclosure value exceeds configured threshold
**Example:**
```typescript
// Source: json-rules-engine pattern
import { Engine, Rule } from 'json-rules-engine';

interface ThresholdRule {
  field: string;           // 'disclosureValue', 'estimatedAnnualValue'
  operator: 'gte' | 'gt';  // greater than or equal
  threshold: number;
  action: 'flag' | 'create_case' | 'require_approval';
}

@Injectable()
export class ThresholdService {
  private engine: Engine;

  async evaluateDisclosure(
    disclosure: RiuDisclosureExtension,
    rules: ThresholdRule[],
  ): Promise<ThresholdResult> {
    // Convert rules to json-rules-engine format
    const engineRules = rules.map(r => new Rule({
      conditions: {
        all: [{
          fact: r.field,
          operator: r.operator === 'gte' ? 'greaterThanInclusive' : 'greaterThan',
          value: r.threshold
        }]
      },
      event: { type: r.action, params: { threshold: r.threshold } }
    }));

    this.engine.addRule(...engineRules);

    const facts = {
      disclosureValue: disclosure.disclosureValue?.toNumber() || 0,
      estimatedAnnualValue: disclosure.estimatedAnnualValue?.toNumber() || 0,
    };

    const { events } = await this.engine.run(facts);
    return { triggered: events.length > 0, events };
  }
}
```

### Pattern 3: Conflict Detection Service Pattern
**What:** Cross-reference new disclosures against person's history and organization's vendor/relationship database
**When to use:** On disclosure submission to flag potential conflicts
**Example:**
```typescript
// Source: Compliance industry patterns + existing DisclosureRiuService
interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
}

interface ConflictItem {
  type: 'SELF_DEALING' | 'OVERLAPPING_RELATIONSHIP' | 'VENDOR_CONFLICT' | 'PRIOR_DISCLOSURE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  relatedDisclosureId?: string;
  relatedPersonId?: string;
}

@Injectable()
export class ConflictDetectionService {
  async detectConflicts(
    personId: string,
    newDisclosure: CreateDisclosureDto,
    organizationId: string,
  ): Promise<ConflictCheckResult> {
    // 1. Get person's disclosure history
    const history = await this.disclosureRiuService.getDisclosuresByPerson(
      personId,
      organizationId
    );

    // 2. Check for overlapping companies
    const companyConflicts = await this.checkCompanyConflicts(
      newDisclosure.relatedCompany,
      history
    );

    // 3. Check for overlapping relationships
    const relationshipConflicts = await this.checkRelationshipConflicts(
      newDisclosure.relatedPersonName,
      history
    );

    // 4. Check against vendor database (if available)
    const vendorConflicts = await this.checkVendorConflicts(
      newDisclosure.relatedCompany,
      personId,
      organizationId
    );

    return {
      hasConflicts: [...companyConflicts, ...relationshipConflicts, ...vendorConflicts].length > 0,
      conflicts: [...companyConflicts, ...relationshipConflicts, ...vendorConflicts]
    };
  }
}
```

### Pattern 4: Multi-Step Form Wizard Pattern
**What:** Disclosure forms as multi-step wizards with draft saving
**When to use:** Complex disclosure forms (COI, Outside Employment)
**Example:**
```typescript
// Frontend pattern for multi-step disclosure forms
interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  formData: Partial<DisclosureFormData>;
  isDirty: boolean;
}

// Auto-save on step completion
const useDisclosureWizard = (assignmentId: string) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Auto-save draft every 30 seconds if dirty
  useEffect(() => {
    if (!state.isDirty) return;
    const timer = setTimeout(() => {
      saveDraft(assignmentId, state.formData);
      dispatch({ type: 'MARK_CLEAN' });
    }, 30000);
    return () => clearTimeout(timer);
  }, [state.formData, state.isDirty]);

  // Save on step navigation
  const goToStep = async (step: number) => {
    await saveDraft(assignmentId, state.formData);
    dispatch({ type: 'GO_TO_STEP', step });
  };

  return { state, goToStep, ... };
};
```

### Pattern 5: Campaign Dashboard Statistics Pattern
**What:** Real-time campaign progress tracking with optimized queries
**When to use:** Campaign list and detail views
**Example:**
```typescript
// Leverage existing denormalized stats on Campaign model
// totalAssignments, completedAssignments, overdueAssignments, completionPercentage

interface CampaignDashboardStats {
  // High-level metrics
  totalCampaigns: number;
  activeCampaigns: number;

  // Completion metrics
  overallCompletionRate: number;
  assignmentsByStatus: Record<AssignmentStatus, number>;

  // Trend data (for charts)
  completionTrend: { date: string; completed: number; total: number }[];

  // Action items
  overdueCampaigns: CampaignSummary[];
  upcomingDeadlines: CampaignSummary[];
}

@Injectable()
export class CampaignDashboardService {
  async getDashboardStats(organizationId: string): Promise<CampaignDashboardStats> {
    // Aggregate from denormalized Campaign fields
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: {
        id: true,
        name: true,
        status: true,
        dueDate: true,
        totalAssignments: true,
        completedAssignments: true,
        overdueAssignments: true,
        completionPercentage: true,
      }
    });

    // Calculate aggregates
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      overallCompletionRate: this.calculateOverallCompletion(campaigns),
      // ... etc
    };
  }
}
```

### Anti-Patterns to Avoid
- **Hand-rolling form validation:** Use existing Form/Schema engine with JSON Schema + Ajv
- **Storing thresholds in code:** Store in Campaign.caseCreationThreshold JSON field for configurability
- **Per-request statistics calculations:** Use denormalized stats on Campaign model, update on assignment changes
- **Synchronous conflict detection:** Run conflict detection async, store results on RiuDisclosureExtension
- **Separate disclosure entity:** Disclosures ARE RIUs with RiuDisclosureExtension - don't create redundant entity

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validators | JSON Schema + Ajv (existing Form engine) | Edge cases, consistent with existing forms |
| Rule evaluation | if/else chains | json-rules-engine | Auditable, maintainable, admin-configurable |
| Campaign targeting | Custom SQL | SegmentQueryBuilder (existing) | Already handles nested AND/OR, tested |
| Notifications | Custom email sending | NotificationService (existing) | Preference handling, templates, queueing |
| Approval workflows | Custom state machines | WorkflowTemplate/Instance (existing) | Already supports multi-step, escalation |
| Employee snapshots | Manual field copying | CampaignAssignmentService (existing) | Already captures snapshot at assignment time |

**Key insight:** Phase 9 is primarily about orchestrating existing infrastructure for disclosure-specific workflows, not building new foundational components.

## Common Pitfalls

### Pitfall 1: Ignoring Existing Infrastructure
**What goes wrong:** Building new Disclosure entity instead of using RIU + RiuDisclosureExtension
**Why it happens:** Tendency to model from scratch when seeing new domain
**How to avoid:** ALWAYS check existing schema first - disclosures flow through RIU system
**Warning signs:** Creating new tables that duplicate RIU fields

### Pitfall 2: Threshold Evaluation Timing
**What goes wrong:** Evaluating thresholds after RIU creation, missing the creation trigger
**Why it happens:** Threshold logic added as afterthought
**How to avoid:** Build threshold evaluation into disclosure submission flow BEFORE RIU finalization
**Warning signs:** Cases created without proper audit trail linking to disclosure

### Pitfall 3: Campaign Statistics Stale Data
**What goes wrong:** Dashboard shows incorrect completion rates
**Why it happens:** Not updating denormalized stats on all state transitions
**How to avoid:** Use CampaignAssignmentService.updateCampaignStatistics() on EVERY assignment status change
**Warning signs:** Manual refresh needed to see accurate numbers

### Pitfall 4: Missing Employee Portal Integration
**What goes wrong:** Employees can't find or complete their disclosure assignments
**Why it happens:** Building separate disclosure submission flow instead of integrating with Employee Portal tasks
**How to avoid:** Disclosures appear as tasks in EmployeeTasksService, use actionUrl pattern
**Warning signs:** Two different places employees need to check for tasks

### Pitfall 5: Conflict Detection Performance
**What goes wrong:** Disclosure submission becomes slow with large disclosure history
**Why it happens:** Eager loading all disclosure history for conflict check
**How to avoid:** Scope conflict detection to recent history (e.g., last 3 years), use indexed queries
**Warning signs:** Timeout errors on submission for long-tenured employees

### Pitfall 6: Form Draft State Loss
**What goes wrong:** Employee loses partial disclosure when navigating away
**Why it happens:** No draft persistence, form state only in memory
**How to avoid:** Auto-save drafts to backend on step changes and periodic intervals
**Warning signs:** User complaints about lost work, low completion rates

## Code Examples

### Example 1: Disclosure Form Template Creation
```typescript
// apps/backend/src/modules/campaigns/disclosure/disclosure-form.service.ts

import { Injectable } from '@nestjs/common';
import { FormSchemaService } from '../../forms/form-schema.service';
import { FormType, DisclosureType } from '@prisma/client';
import { FormSchema, UiSchema } from '../../forms/types/form.types';

// Standard COI form template
const COI_FORM_SCHEMA: FormSchema = {
  type: 'object',
  title: 'Conflict of Interest Disclosure',
  required: ['conflictDescription', 'relatedParty', 'effectiveDate'],
  properties: {
    conflictDescription: {
      type: 'string',
      title: 'Description of Potential Conflict',
      description: 'Describe the nature of the conflict or potential conflict',
      minLength: 50,
      maxLength: 2000,
    },
    relatedParty: {
      type: 'object',
      title: 'Related Party Information',
      required: ['name', 'relationship'],
      properties: {
        name: { type: 'string', title: 'Name' },
        relationship: {
          type: 'string',
          title: 'Relationship Type',
          enum: ['spouse', 'family_member', 'business_partner', 'former_employer', 'other'],
        },
        company: { type: 'string', title: 'Company/Organization' },
        position: { type: 'string', title: 'Position/Role' },
      },
    },
    financialInterest: {
      type: 'object',
      title: 'Financial Interest',
      properties: {
        hasFinancialInterest: {
          type: 'boolean',
          title: 'Do you have a financial interest?',
          default: false,
        },
        estimatedValue: {
          type: 'number',
          title: 'Estimated Value ($)',
          minimum: 0,
        },
        ownershipPercentage: {
          type: 'number',
          title: 'Ownership Percentage',
          minimum: 0,
          maximum: 100,
        },
      },
    },
    effectiveDate: {
      type: 'string',
      format: 'date',
      title: 'When did this conflict begin?',
    },
    mitigationProposal: {
      type: 'string',
      title: 'Proposed Mitigation (if any)',
      maxLength: 1000,
    },
    attestation: {
      type: 'boolean',
      title: 'I certify that the information provided is true and complete',
      const: true,
    },
  },
};

const COI_UI_SCHEMA: UiSchema = {
  order: ['conflictDescription', 'relatedParty', 'financialInterest', 'effectiveDate', 'mitigationProposal', 'attestation'],
  fields: {
    conflictDescription: { widget: 'textarea', colSpan: 12 },
    relatedParty: { colSpan: 12 },
    financialInterest: { colSpan: 12 },
    effectiveDate: { widget: 'date', colSpan: 6 },
    mitigationProposal: { widget: 'textarea', colSpan: 12 },
    attestation: { widget: 'checkbox', colSpan: 12 },
  },
  conditionals: [
    {
      if: { field: 'financialInterest.hasFinancialInterest', value: true, operator: 'eq' },
      then: { require: ['financialInterest.estimatedValue'] },
    },
  ],
};

@Injectable()
export class DisclosureFormService {
  constructor(private formSchemaService: FormSchemaService) {}

  async createCOIFormTemplate(organizationId: string, userId: string) {
    return this.formSchemaService.create(organizationId, {
      name: 'Conflict of Interest Disclosure',
      description: 'Standard COI disclosure form for annual certification',
      formType: FormType.DISCLOSURE,
      schema: COI_FORM_SCHEMA,
      uiSchema: COI_UI_SCHEMA,
      requiresApproval: true,
    }, userId);
  }

  // Similar methods for GIFT and OUTSIDE_EMPLOYMENT templates
}
```

### Example 2: Threshold-Based Auto-Case Creation
```typescript
// apps/backend/src/modules/campaigns/disclosure/threshold.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Engine, Rule, RuleResult } from 'json-rules-engine';
import { RiuDisclosureExtension, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ThresholdConfig {
  disclosureType: string;
  rules: ThresholdRule[];
}

export interface ThresholdRule {
  name: string;
  field: 'disclosureValue' | 'estimatedAnnualValue';
  operator: 'greaterThanInclusive' | 'greaterThan';
  threshold: number;
  action: 'flag' | 'create_case' | 'require_approval';
  priority?: number;
}

export interface ThresholdEvaluationResult {
  triggered: boolean;
  triggeredRules: string[];
  maxTriggeredThreshold: number | null;
  recommendedAction: 'none' | 'flag' | 'create_case' | 'require_approval';
}

@Injectable()
export class ThresholdService {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Evaluate disclosure against organization's threshold rules.
   * Returns which rules triggered and recommended action.
   */
  async evaluateDisclosure(
    disclosure: RiuDisclosureExtension,
    organizationId: string,
  ): Promise<ThresholdEvaluationResult> {
    // Get threshold config from organization settings or campaign
    const config = await this.getThresholdConfig(
      organizationId,
      disclosure.disclosureType,
    );

    if (!config || config.rules.length === 0) {
      return {
        triggered: false,
        triggeredRules: [],
        maxTriggeredThreshold: null,
        recommendedAction: 'none',
      };
    }

    const engine = new Engine();

    // Add rules to engine
    for (const rule of config.rules) {
      engine.addRule(new Rule({
        name: rule.name,
        priority: rule.priority || 1,
        conditions: {
          all: [{
            fact: rule.field,
            operator: rule.operator,
            value: rule.threshold,
          }],
        },
        event: {
          type: rule.action,
          params: {
            ruleName: rule.name,
            threshold: rule.threshold,
          },
        },
      }));
    }

    // Build facts from disclosure
    const facts = {
      disclosureValue: disclosure.disclosureValue
        ? Number(disclosure.disclosureValue)
        : 0,
      estimatedAnnualValue: disclosure.estimatedAnnualValue
        ? Number(disclosure.estimatedAnnualValue)
        : 0,
    };

    const { events } = await engine.run(facts);

    if (events.length === 0) {
      return {
        triggered: false,
        triggeredRules: [],
        maxTriggeredThreshold: null,
        recommendedAction: 'none',
      };
    }

    // Determine highest-priority action
    const actionPriority = { 'create_case': 3, 'require_approval': 2, 'flag': 1 };
    let maxAction = 'flag';
    let maxThreshold = 0;
    const triggeredRules: string[] = [];

    for (const event of events) {
      triggeredRules.push(event.params?.ruleName);
      const threshold = event.params?.threshold || 0;
      if (threshold > maxThreshold) {
        maxThreshold = threshold;
      }
      if (actionPriority[event.type] > actionPriority[maxAction]) {
        maxAction = event.type;
      }
    }

    return {
      triggered: true,
      triggeredRules,
      maxTriggeredThreshold: maxThreshold,
      recommendedAction: maxAction as 'flag' | 'create_case' | 'require_approval',
    };
  }

  private async getThresholdConfig(
    organizationId: string,
    disclosureType: string,
  ): Promise<ThresholdConfig | null> {
    // Get from organization settings
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const thresholds = settings?.disclosureThresholds as Record<string, ThresholdConfig> | undefined;

    return thresholds?.[disclosureType] || null;
  }
}
```

### Example 3: Conflict Detection Service
```typescript
// apps/backend/src/modules/campaigns/disclosure/conflict-detection.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DisclosureRiuService } from '../../rius/extensions/disclosure-riu.service';

export interface ConflictItem {
  type: 'OVERLAPPING_RELATIONSHIP' | 'VENDOR_CONFLICT' | 'PRIOR_DISCLOSURE' | 'FAMILY_CONFLICT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  relatedDisclosureId?: string;
  relatedCompany?: string;
  confidence: number; // 0-100, based on name/company matching
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
  checkTimestamp: Date;
}

@Injectable()
export class ConflictDetectionService {
  private readonly logger = new Logger(ConflictDetectionService.name);

  constructor(
    private prisma: PrismaService,
    private disclosureRiuService: DisclosureRiuService,
  ) {}

  /**
   * Detect potential conflicts for a new disclosure.
   * Checks against person's disclosure history and organization's vendor database.
   */
  async detectConflicts(
    personId: string,
    organizationId: string,
    newDisclosure: {
      relatedCompany?: string;
      relatedPersonName?: string;
      relationshipType?: string;
    },
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictItem[] = [];

    // 1. Check company conflicts against prior disclosures
    if (newDisclosure.relatedCompany) {
      const companyConflicts = await this.checkCompanyConflicts(
        personId,
        organizationId,
        newDisclosure.relatedCompany,
      );
      conflicts.push(...companyConflicts);
    }

    // 2. Check relationship conflicts (same person in multiple disclosures)
    if (newDisclosure.relatedPersonName) {
      const relationshipConflicts = await this.checkRelationshipConflicts(
        personId,
        organizationId,
        newDisclosure.relatedPersonName,
      );
      conflicts.push(...relationshipConflicts);
    }

    // 3. Check against organization vendor database (if available)
    if (newDisclosure.relatedCompany) {
      const vendorConflicts = await this.checkVendorConflicts(
        personId,
        organizationId,
        newDisclosure.relatedCompany,
      );
      conflicts.push(...vendorConflicts);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkTimestamp: new Date(),
    };
  }

  private async checkCompanyConflicts(
    personId: string,
    organizationId: string,
    companyName: string,
  ): Promise<ConflictItem[]> {
    // Get prior disclosures involving similar company names
    const priorDisclosures = await this.disclosureRiuService.getDisclosuresByCompany(
      companyName,
      organizationId,
    );

    const conflicts: ConflictItem[] = [];

    for (const prior of priorDisclosures) {
      // Skip if same person's own disclosure
      if (prior.relatedPersonId === personId) continue;

      // Calculate name similarity (simple contains check)
      const similarity = this.calculateSimilarity(
        companyName.toLowerCase(),
        prior.relatedCompany?.toLowerCase() || '',
      );

      if (similarity > 70) {
        conflicts.push({
          type: 'OVERLAPPING_RELATIONSHIP',
          severity: similarity > 90 ? 'HIGH' : 'MEDIUM',
          description: `Similar company "${prior.relatedCompany}" found in prior disclosure`,
          relatedDisclosureId: prior.riuId,
          relatedCompany: prior.relatedCompany || undefined,
          confidence: similarity,
        });
      }
    }

    return conflicts;
  }

  private async checkRelationshipConflicts(
    personId: string,
    organizationId: string,
    relatedPersonName: string,
  ): Promise<ConflictItem[]> {
    const priorDisclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        relatedPersonName: {
          contains: relatedPersonName,
          mode: 'insensitive',
        },
      },
      take: 10,
    });

    return priorDisclosures.map(prior => ({
      type: 'PRIOR_DISCLOSURE' as const,
      severity: 'MEDIUM' as const,
      description: `Person "${relatedPersonName}" appears in prior disclosure`,
      relatedDisclosureId: prior.riuId,
      confidence: 80,
    }));
  }

  private async checkVendorConflicts(
    personId: string,
    organizationId: string,
    companyName: string,
  ): Promise<ConflictItem[]> {
    // Check if company is a vendor with active relationship
    // This would require a Vendor entity - placeholder for future integration
    return [];
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (str1.includes(str2) || str2.includes(str1)) return 85;

    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;

    if (longerLength === 0) return 100;

    return ((longerLength - this.editDistance(longer, shorter)) / longerLength) * 100;
  }

  private editDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }
}
```

### Example 4: Campaign Dashboard Statistics
```typescript
// apps/backend/src/modules/campaigns/dashboard/campaign-dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignStatus, AssignmentStatus } from '@prisma/client';

export interface DashboardStats {
  // Summary counts
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;

  // Completion metrics
  overallCompletionRate: number;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;

  // By status breakdown
  assignmentsByStatus: Record<string, number>;

  // Campaigns needing attention
  overdueCampaigns: CampaignSummary[];
  upcomingDeadlines: CampaignSummary[];

  // Trend data for charts
  weeklyCompletions: WeeklyCompletion[];
}

export interface CampaignSummary {
  id: string;
  name: string;
  type: string;
  dueDate: Date;
  completionPercentage: number;
  totalAssignments: number;
  overdueAssignments: number;
}

export interface WeeklyCompletion {
  weekStart: string;
  completed: number;
  total: number;
}

@Injectable()
export class CampaignDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    // Get all campaigns with their denormalized stats
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        dueDate: true,
        totalAssignments: true,
        completedAssignments: true,
        overdueAssignments: true,
        completionPercentage: true,
      },
    });

    // Calculate aggregates from denormalized data
    const activeCampaigns = campaigns.filter(c => c.status === CampaignStatus.ACTIVE);
    const completedCampaigns = campaigns.filter(c => c.status === CampaignStatus.COMPLETED);

    const totalAssignments = campaigns.reduce((sum, c) => sum + c.totalAssignments, 0);
    const completedAssignments = campaigns.reduce((sum, c) => sum + c.completedAssignments, 0);
    const overdueAssignments = campaigns.reduce((sum, c) => sum + c.overdueAssignments, 0);

    // Get assignment status breakdown for active campaigns
    const assignmentCounts = await this.prisma.campaignAssignment.groupBy({
      by: ['status'],
      where: {
        organizationId,
        campaign: { status: CampaignStatus.ACTIVE },
      },
      _count: true,
    });

    const assignmentsByStatus: Record<string, number> = {};
    for (const count of assignmentCounts) {
      assignmentsByStatus[count.status] = count._count;
    }

    // Get campaigns with overdue assignments
    const overdueCampaigns = activeCampaigns
      .filter(c => c.overdueAssignments > 0)
      .sort((a, b) => b.overdueAssignments - a.overdueAssignments)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        dueDate: c.dueDate,
        completionPercentage: c.completionPercentage,
        totalAssignments: c.totalAssignments,
        overdueAssignments: c.overdueAssignments,
      }));

    // Get campaigns with upcoming deadlines (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingDeadlines = activeCampaigns
      .filter(c => c.dueDate <= sevenDaysFromNow && c.dueDate > new Date())
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        dueDate: c.dueDate,
        completionPercentage: c.completionPercentage,
        totalAssignments: c.totalAssignments,
        overdueAssignments: c.overdueAssignments,
      }));

    // Get weekly completion trend (last 8 weeks)
    const weeklyCompletions = await this.getWeeklyCompletionTrend(organizationId);

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      completedCampaigns: completedCampaigns.length,
      overallCompletionRate: totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      assignmentsByStatus,
      overdueCampaigns,
      upcomingDeadlines,
      weeklyCompletions,
    };
  }

  private async getWeeklyCompletionTrend(organizationId: string): Promise<WeeklyCompletion[]> {
    // Get completions by week for last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const completions = await this.prisma.campaignAssignment.findMany({
      where: {
        organizationId,
        completedAt: { gte: eightWeeksAgo },
        status: AssignmentStatus.COMPLETED,
      },
      select: { completedAt: true },
    });

    // Group by week
    const weekMap = new Map<string, { completed: number }>();
    for (const c of completions) {
      if (!c.completedAt) continue;
      const weekStart = this.getWeekStart(c.completedAt);
      const key = weekStart.toISOString().split('T')[0];
      const current = weekMap.get(key) || { completed: 0 };
      current.completed++;
      weekMap.set(key, current);
    }

    // Build result array
    const result: WeeklyCompletion[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const key = this.getWeekStart(weekStart).toISOString().split('T')[0];
      result.push({
        weekStart: key,
        completed: weekMap.get(key)?.completed || 0,
        total: 0, // Would need separate query for total assigned that week
      });
    }

    return result;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Annual batch disclosure collection | Continuous + annual campaigns | 2024-2025 | More responsive to changes |
| Manual threshold checking | Automated rule-based triggers | 2024 | Faster response, audit trail |
| Simple form validation | JSON Schema with conditional logic | 2023 | More complex forms possible |
| Static approval chains | Dynamic workflow routing | 2024 | Flexible escalation |
| Manual conflict detection | AI-assisted pattern matching | 2025 | Higher detection rates |

**Current industry trends (2025-2026):**
- Annual certification trending toward continuous disclosure model
- AI-powered conflict detection becoming standard
- Rule-based threshold automation for case creation
- Mobile-first disclosure forms
- Real-time dashboard visualization

**Deprecated/outdated:**
- Spreadsheet-based disclosure tracking: Replaced by dedicated platforms
- Email-only campaign notifications: Supplement with in-app notifications

## Open Questions

1. **AI Conflict Detection Enhancement**
   - What we know: Basic pattern matching works for company/person name conflicts
   - What's unclear: Whether to integrate AI for semantic similarity detection
   - Recommendation: Start with deterministic matching, add AI enhancement in future iteration

2. **Vendor Database Integration**
   - What we know: Conflict detection against vendor relationships adds value
   - What's unclear: Whether Vendor entity exists or is planned
   - Recommendation: Build conflict detection service with vendor integration as optional extension point

3. **Multi-Currency Threshold Handling**
   - What we know: disclosureCurrency field exists on RiuDisclosureExtension
   - What's unclear: Whether threshold rules should convert currencies or apply per-currency
   - Recommendation: Store thresholds in USD, use conversion rates for non-USD disclosures

## Sources

### Primary (HIGH confidence)
- Project Prisma schema - Campaign, CampaignAssignment, RiuDisclosureExtension models
- Existing services: CampaignsService, CampaignAssignmentService, DisclosureRiuService, SegmentService, NotificationService
- Form engine: FormSchemaService, form.types.ts

### Secondary (MEDIUM confidence)
- [OneTrust COI Disclosures Template](https://www.onetrust.com/blog/coi-disclosures-template/) - Form design patterns
- [NAVEX COI Disclosure Management](https://www.navex.com/en-us/platform/employee-compliance/coi-disclosure-management/) - Industry workflow patterns
- [Cflow Multi-Level Approval](https://www.cflowapps.com/parallel-pathways-multi-level-approvals-workflow/) - Approval workflow patterns
- [Explo Compliance Dashboards](https://www.explo.co/blog/compliance-dashboards-compliance-management-reporting) - Dashboard visualization patterns
- [json-rules-engine](https://github.com/CacheControl/json-rules-engine) - Rule engine library

### Tertiary (LOW confidence)
- Control Risks conflict detection patterns - General concepts only
- Various compliance software marketing materials - Feature lists only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project infrastructure
- Architecture: HIGH - Following established patterns in codebase
- Disclosure forms: HIGH - Extending existing Form engine
- Threshold detection: MEDIUM - json-rules-engine approach needs validation
- Conflict detection: MEDIUM - Algorithm approach needs real-world testing
- Dashboard: HIGH - Standard aggregation patterns

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain with established infrastructure)

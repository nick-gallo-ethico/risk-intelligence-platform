# Phase 2: Demo Tenant & Seed Data - Research

**Researched:** 2026-02-02
**Domain:** Test data generation, demo tenant provisioning, seed data factories, temporal consistency
**Confidence:** HIGH

## Summary

Phase 2 creates the "Acme Co." demo tenant with 3 years of realistic compliance data. This demo environment serves dual purposes: a living test bed that proves features work during development, and a sales demonstration environment for customer acquisition.

The research reveals a well-established pattern for this work: use `@faker-js/faker` with deterministic seeding for reproducible data, Prisma's seeding infrastructure for database population, and a factory pattern for generating entity-specific data. The key challenge is ensuring **temporal consistency** - data must have realistic progression timestamps that tell a coherent story over the 3-year period.

The existing codebase already has a basic `prisma/seed.ts` with an "acme-corp" organization and 4 users. Phase 2 extends this foundation significantly with hundreds of employees, thousands of RIUs and Cases, and multiple completed campaigns - all with realistic historical timestamps.

**Primary recommendation:** Build a modular seed data factory system with `@faker-js/faker` deterministic seeding, temporal distribution utilities, and a NestJS CLI command for demo reset. Use the existing `prisma/seed.ts` as the entry point but organize generators in `prisma/seeders/` subdirectory.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @faker-js/faker | ^9.x | Fake data generation | Modern maintained fork of faker.js, TypeScript native |
| Prisma Client | ^5.8.0 | Database operations | Already in project, native to NestJS |
| date-fns | ^3.x | Date manipulation | Lightweight, immutable, tree-shakeable |
| nanoid | ^3.3.11 | ID generation | Already in project for reference numbers |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/cli | ^10.3.0 | Custom commands | Demo reset CLI command |
| chalk | ^5.x | CLI output coloring | Seed progress display |
| cli-progress | ^3.x | Progress bars | Long-running seed operations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @faker-js/faker | Chance.js | Faker has better NestJS integration, more realistic data |
| date-fns | moment.js | date-fns is lighter, moment is deprecated |
| Manual SQL | Prisma seed | Prisma provides type safety and transaction support |

**Installation:**
```bash
npm install @faker-js/faker date-fns chalk cli-progress
npm install --save-dev @types/cli-progress
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/prisma/
├── seed.ts                    # Entry point (existing)
├── seeders/
│   ├── index.ts               # Orchestrator
│   ├── config.ts              # Seed configuration (volumes, dates)
│   ├── utils/
│   │   ├── temporal.ts        # Date distribution utilities
│   │   ├── weighted-random.ts # Weighted selection utilities
│   │   └── progress.ts        # Progress bar wrapper
│   ├── demo-tenant.seeder.ts  # Organization + base setup
│   ├── employee.seeder.ts     # 500+ employees with hierarchy
│   ├── category.seeder.ts     # Case/disclosure categories
│   ├── riu.seeder.ts          # 2000+ RIUs (all types)
│   ├── case.seeder.ts         # 1500+ cases with investigations
│   ├── campaign.seeder.ts     # Completed campaigns
│   └── user.seeder.ts         # Demo user accounts
└── reset-demo.ts              # Demo reset script
```

### Pattern 1: Deterministic Faker Seeding

**What:** Using faker.seed() to generate reproducible data across runs.

**When to use:** All seed data generation to ensure demo can be reliably reset.

**Example:**
```typescript
// Source: https://fakerjs.dev/api/faker#seed
import { faker } from '@faker-js/faker';

const DEMO_SEED = 20260202; // Consistent seed for Acme Co.

export function initializeFaker(): void {
  faker.seed(DEMO_SEED);
  // Also set reference date for date methods
  faker.setDefaultRefDate(new Date('2026-02-02'));
}

// Usage in seeder
export async function seedEmployees(orgId: string, count: number) {
  // Re-seed before each major operation for reproducibility
  faker.seed(DEMO_SEED + 1000); // Offset for employees

  const employees = [];
  for (let i = 0; i < count; i++) {
    employees.push({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      jobTitle: faker.person.jobTitle(),
      hireDate: faker.date.past({ years: 5 }),
    });
  }
  return employees;
}
```

### Pattern 2: Temporal Distribution for Historical Data

**What:** Distributing events realistically over a 3-year period with seasonal patterns.

**When to use:** All timestamped entities (RIUs, Cases, Investigations, Campaigns).

**Example:**
```typescript
// Source: Custom pattern based on research
import { subDays, subMonths, addDays } from 'date-fns';
import { faker } from '@faker-js/faker';

const DEMO_CURRENT_DATE = new Date('2026-02-02');
const HISTORY_YEARS = 3;

export function generateHistoricalDate(options?: {
  recentBias?: number; // 0-1, higher = more recent dates
  businessDaysOnly?: boolean;
}): Date {
  const { recentBias = 0.3, businessDaysOnly = false } = options || {};

  const daysBack = HISTORY_YEARS * 365;

  // Apply bias toward recent dates using exponential distribution
  const randomFactor = Math.pow(Math.random(), 1 / (1 + recentBias));
  const targetDaysBack = Math.floor(randomFactor * daysBack);

  let date = subDays(DEMO_CURRENT_DATE, targetDaysBack);

  if (businessDaysOnly) {
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date = addDays(date, 1);
    }
  }

  return date;
}

// For case progression with realistic timelines
export function generateCaseTimeline(intakeDate: Date): {
  createdAt: Date;
  assignedAt: Date;
  investigationStartedAt: Date;
  closedAt?: Date;
} {
  const assignedAt = addDays(intakeDate, faker.number.int({ min: 1, max: 3 }));
  const investigationStartedAt = addDays(assignedAt, faker.number.int({ min: 1, max: 5 }));

  // 70% of cases are closed
  const isClosed = faker.number.float({ min: 0, max: 1 }) < 0.7;
  const closedAt = isClosed
    ? addDays(investigationStartedAt, faker.number.int({ min: 7, max: 90 }))
    : undefined;

  return {
    createdAt: intakeDate,
    assignedAt,
    investigationStartedAt,
    closedAt,
  };
}
```

### Pattern 3: Weighted Distribution for Realistic Data

**What:** Using weighted random selection to create realistic distributions.

**When to use:** Severity, status, category, and outcome distributions.

**Example:**
```typescript
// Source: Common pattern for test data generation
export function weightedRandom<T>(options: Array<{ value: T; weight: number }>): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

// Usage for case severity distribution
const severity = weightedRandom([
  { value: 'HIGH', weight: 15 },     // 15%
  { value: 'MEDIUM', weight: 55 },   // 55%
  { value: 'LOW', weight: 30 },      // 30%
]);

// For case outcomes (closed cases only)
const outcome = weightedRandom([
  { value: 'SUBSTANTIATED', weight: 35 },
  { value: 'UNSUBSTANTIATED', weight: 45 },
  { value: 'INCONCLUSIVE', weight: 20 },
]);
```

### Pattern 4: Factory Pattern for Entity Generation

**What:** Dedicated factory functions per entity type with configuration options.

**When to use:** Each major entity needs its own factory.

**Example:**
```typescript
// Source: Standard NestJS testing pattern
import { faker } from '@faker-js/faker';
import { Severity, CaseStatus, SourceChannel } from '@prisma/client';

export interface CaseFactoryOptions {
  organizationId: string;
  createdById: string;
  severity?: Severity;
  status?: CaseStatus;
  sourceChannel?: SourceChannel;
  createdAt?: Date;
}

export function createCaseData(options: CaseFactoryOptions): CreateCaseInput {
  const createdAt = options.createdAt || generateHistoricalDate({ recentBias: 0.4 });
  const timeline = generateCaseTimeline(createdAt);

  return {
    organizationId: options.organizationId,
    referenceNumber: generateReferenceNumber('CASE', createdAt),
    status: options.status || weightedRandom([
      { value: CaseStatus.NEW, weight: 10 },
      { value: CaseStatus.OPEN, weight: 20 },
      { value: CaseStatus.CLOSED, weight: 70 },
    ]),
    sourceChannel: options.sourceChannel || weightedRandom([
      { value: SourceChannel.HOTLINE, weight: 40 },
      { value: SourceChannel.WEB_FORM, weight: 35 },
      { value: SourceChannel.PROXY, weight: 15 },
      { value: SourceChannel.CHATBOT, weight: 10 },
    ]),
    severity: options.severity || weightedRandom([
      { value: Severity.HIGH, weight: 15 },
      { value: Severity.MEDIUM, weight: 55 },
      { value: Severity.LOW, weight: 30 },
    ]),
    details: faker.lorem.paragraphs({ min: 2, max: 5 }),
    summary: faker.lorem.sentence(),
    createdAt: timeline.createdAt,
    createdById: options.createdById,
    updatedById: options.createdById,
    ...timeline,
  };
}
```

### Pattern 5: Demo Reset Command

**What:** NestJS CLI command to reset demo data without affecting other tenants.

**When to use:** Sales rep needs fresh demo for new prospect.

**Example:**
```typescript
// Source: NestJS CLI pattern
// apps/backend/src/commands/reset-demo.command.ts
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'reset-demo',
  description: 'Reset Acme Co. demo tenant to fresh state',
})
export class ResetDemoCommand extends CommandRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seedService: SeedService,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('Resetting demo tenant...');

    const org = await this.prisma.organization.findUnique({
      where: { slug: 'acme-corp' },
    });

    if (!org) {
      throw new Error('Demo tenant not found');
    }

    // Delete transactional data only (preserve org structure)
    await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.caseMessage.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.interaction.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.subject.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.riuCaseAssociation.deleteMany({
        where: { riu: { organizationId: org.id } },
      }),
      this.prisma.investigationNote.deleteMany({
        where: { investigation: { organizationId: org.id } },
      }),
      this.prisma.investigation.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.case.deleteMany({ where: { organizationId: org.id } }),
      this.prisma.riskIntelligenceUnit.deleteMany({ where: { organizationId: org.id } }),
    ]);

    // Re-seed transactional data
    await this.seedService.seedDemoData(org.id);

    console.log('Demo reset complete!');
  }
}
```

### Anti-Patterns to Avoid

- **Random data without seeding:** Never use `Math.random()` directly. Always use faker with a seed for reproducibility.

- **Hardcoded dates:** Never use `new Date()` for historical data. Use the temporal distribution utilities.

- **Sequential timestamps:** Real data has clusters and gaps. Distribute timestamps with realistic patterns.

- **Cross-tenant data references:** Demo data must only reference IDs within the demo organization.

- **Ignoring foreign key constraints:** Always create parent entities before children (users before cases, etc.).

- **Large single transactions:** Break seed operations into batches to avoid memory issues and enable progress tracking.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fake names/emails | Random string generation | @faker-js/faker | Realistic names, proper email formats |
| Date distributions | Manual date math | date-fns + temporal utilities | Edge cases (leap years, timezones) |
| Reference numbers | Simple counters | nanoid + date prefix | Uniqueness, format consistency |
| Progress display | console.log | cli-progress | User experience for long operations |
| Batch inserts | Loop of single inserts | Prisma createMany | Performance (10x faster) |
| Manager hierarchy | Random assignment | Tree generation algorithm | Realistic org structures |

**Key insight:** Seed data quality directly impacts demo effectiveness. Invest in realistic data generation upfront rather than fixing unrealistic demos later.

## Common Pitfalls

### Pitfall 1: Non-Deterministic Seeding

**What goes wrong:** Demo reset produces different data each time, making it impossible to create reliable demo scripts.

**Why it happens:** Using `Math.random()` or forgetting to seed faker.

**How to avoid:** Always call `faker.seed(CONSTANT)` before each seeding operation. Document the seed values.

**Warning signs:** "The case from yesterday's demo isn't there anymore."

### Pitfall 2: Orphaned References

**What goes wrong:** Cases reference users that don't exist, or RIUs reference categories that weren't seeded.

**Why it happens:** Seeding entities in wrong order, or using hardcoded IDs.

**How to avoid:** Seed in dependency order: Organization -> Categories -> Users -> Employees -> RIUs -> Cases. Store created IDs and pass to dependent seeders.

**Warning signs:** Foreign key constraint violations during seed.

### Pitfall 3: Unrealistic Temporal Distribution

**What goes wrong:** All cases have timestamps within a few minutes of each other, or dates are perfectly evenly distributed.

**Why it happens:** Simple date math without business logic.

**How to avoid:** Use weighted distributions with recency bias. Skip weekends for business operations. Add clusters for seasonal patterns.

**Warning signs:** Analytics dashboards show flat lines or impossible spikes.

### Pitfall 4: Memory Exhaustion on Large Seeds

**What goes wrong:** Seed script crashes when generating 2000+ RIUs.

**Why it happens:** Building entire array in memory before insert.

**How to avoid:** Batch operations (insert 100 at a time), use streaming/generators where possible.

**Warning signs:** Node.js heap out of memory errors.

### Pitfall 5: Inconsistent Case Progression

**What goes wrong:** Closed cases have no investigation, or investigation dates precede case creation.

**Why it happens:** Independent timestamp generation for related entities.

**How to avoid:** Generate complete timelines for each case as a unit. Validate date order before insert.

**Warning signs:** "Case was closed before investigation started" in activity logs.

## Code Examples

### Complete Seed Configuration

```typescript
// prisma/seeders/config.ts
// Source: Custom pattern for this project

export const SEED_CONFIG = {
  // Master seed for reproducibility
  masterSeed: 20260202,

  // Reference date (all historical data is before this)
  currentDate: new Date('2026-02-02'),

  // History span
  historyYears: 3,

  // Volume targets
  volumes: {
    employees: 500,
    rius: 2000,
    cases: 1500,
    campaigns: 12, // 4 per year
    investigations: 1800, // Most cases have investigations
  },

  // Distribution weights
  distributions: {
    riuTypes: {
      HOTLINE_REPORT: 35,
      WEB_FORM_SUBMISSION: 30,
      DISCLOSURE_RESPONSE: 15,
      ATTESTATION_RESPONSE: 10,
      INCIDENT_FORM: 5,
      PROXY_REPORT: 3,
      CHATBOT_TRANSCRIPT: 2,
    },
    caseSeverity: {
      HIGH: 15,
      MEDIUM: 55,
      LOW: 30,
    },
    caseStatus: {
      NEW: 5,
      OPEN: 25,
      CLOSED: 70,
    },
    investigationOutcome: {
      SUBSTANTIATED: 35,
      UNSUBSTANTIATED: 45,
      INCONCLUSIVE: 20,
    },
  },

  // Demo users to create
  demoUsers: [
    { email: 'admin@acme.local', role: 'SYSTEM_ADMIN', name: 'Admin User' },
    { email: 'cco@acme.local', role: 'COMPLIANCE_OFFICER', name: 'Chief Compliance Officer' },
    { email: 'triage@acme.local', role: 'TRIAGE_LEAD', name: 'Triage Lead' },
    { email: 'investigator1@acme.local', role: 'INVESTIGATOR', name: 'Senior Investigator' },
    { email: 'investigator2@acme.local', role: 'INVESTIGATOR', name: 'Junior Investigator' },
    { email: 'policy@acme.local', role: 'POLICY_AUTHOR', name: 'Policy Author' },
    { email: 'reviewer@acme.local', role: 'POLICY_REVIEWER', name: 'Policy Reviewer' },
    { email: 'manager@acme.local', role: 'MANAGER', name: 'Department Manager' },
    { email: 'employee@acme.local', role: 'EMPLOYEE', name: 'Regular Employee' },
  ],
};
```

### Employee Hierarchy Generator

```typescript
// prisma/seeders/employee.seeder.ts
// Source: Custom pattern for realistic org structures
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from './config';

interface EmployeeNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  managerId: string | null;
  hireDate: Date;
}

const DEPARTMENTS = [
  { name: 'Executive', weight: 2, titles: ['CEO', 'CFO', 'COO', 'CTO', 'CLO'] },
  { name: 'Human Resources', weight: 8, titles: ['HR Director', 'HR Manager', 'HR Specialist', 'Recruiter'] },
  { name: 'Finance', weight: 12, titles: ['Controller', 'Accountant', 'Financial Analyst'] },
  { name: 'Operations', weight: 25, titles: ['Operations Manager', 'Operations Coordinator', 'Specialist'] },
  { name: 'Sales', weight: 20, titles: ['Sales Director', 'Account Executive', 'Sales Rep'] },
  { name: 'Engineering', weight: 18, titles: ['VP Engineering', 'Engineering Manager', 'Software Engineer', 'QA Engineer'] },
  { name: 'Marketing', weight: 8, titles: ['Marketing Director', 'Marketing Manager', 'Marketing Specialist'] },
  { name: 'Legal', weight: 5, titles: ['General Counsel', 'Legal Counsel', 'Paralegal'] },
  { name: 'Compliance', weight: 2, titles: ['Compliance Director', 'Compliance Officer', 'Compliance Analyst'] },
];

export async function seedEmployees(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Map<string, string>> {
  faker.seed(SEED_CONFIG.masterSeed + 1000);

  const employeeIds = new Map<string, string>();
  const employees: EmployeeNode[] = [];

  // Generate executive team first (no managers)
  const execDept = DEPARTMENTS.find(d => d.name === 'Executive')!;
  for (const title of execDept.titles) {
    const employee = createEmployeeData(title, 'Executive', null);
    employees.push(employee);
  }

  // CEO is the top
  const ceoId = employees.find(e => e.jobTitle === 'CEO')!.id;

  // Generate department heads (report to CEO)
  for (const dept of DEPARTMENTS.filter(d => d.name !== 'Executive')) {
    const headTitle = dept.titles[0]; // First title is always the head
    const employee = createEmployeeData(headTitle, dept.name, ceoId);
    employees.push(employee);
  }

  // Fill remaining employees with proper hierarchy
  const targetCount = SEED_CONFIG.volumes.employees;
  while (employees.length < targetCount) {
    const dept = weightedRandom(DEPARTMENTS.map(d => ({ value: d, weight: d.weight })));
    const deptEmployees = employees.filter(e => e.department === dept.name);

    // Find a manager (prefer department head, then any manager)
    const manager = deptEmployees.find(e => e.jobTitle.includes('Director') || e.jobTitle.includes('Manager'))
      || deptEmployees[0];

    const title = dept.titles[faker.number.int({ min: 1, max: dept.titles.length - 1 })];
    const employee = createEmployeeData(title, dept.name, manager?.id || null);
    employees.push(employee);
  }

  // Batch insert
  await prisma.employee.createMany({
    data: employees.map(e => ({
      ...e,
      organizationId,
      hrisEmployeeId: `HRIS-${e.id.substring(0, 8)}`,
      sourceSystem: 'MANUAL',
      employmentStatus: 'ACTIVE',
      syncedAt: new Date(),
    })),
  });

  // Build ID map for later reference
  for (const emp of employees) {
    employeeIds.set(emp.email, emp.id);
  }

  return employeeIds;
}

function createEmployeeData(
  jobTitle: string,
  department: string,
  managerId: string | null,
): EmployeeNode {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName, provider: 'acme.local' }).toLowerCase(),
    jobTitle,
    department,
    managerId,
    hireDate: faker.date.past({ years: 10, refDate: SEED_CONFIG.currentDate }),
  };
}
```

### RIU Generator with Type-Specific Content

```typescript
// prisma/seeders/riu.seeder.ts
// Source: Custom pattern based on PRD specifications
import { faker } from '@faker-js/faker';
import { RiuType, RiuSourceChannel, RiuReporterType, Severity } from '@prisma/client';
import { SEED_CONFIG } from './config';
import { generateHistoricalDate, weightedRandom } from './utils';

const RIU_TYPE_TEMPLATES = {
  HOTLINE_REPORT: {
    sourceChannel: RiuSourceChannel.PHONE,
    generateDetails: () => {
      const scenarios = [
        'observed a colleague falsifying time records',
        'witnessed harassment in the workplace',
        'discovered potential financial irregularities',
        'saw safety violations being ignored',
        'heard about discriminatory hiring practices',
        'noticed vendor kickback scheme',
        'found evidence of data privacy breach',
      ];
      const scenario = faker.helpers.arrayElement(scenarios);
      return `I am calling to report that I ${scenario}. ${faker.lorem.paragraphs(2)}`;
    },
  },
  WEB_FORM_SUBMISSION: {
    sourceChannel: RiuSourceChannel.WEB_FORM,
    generateDetails: () => {
      return `${faker.lorem.paragraph()}\n\n${faker.lorem.paragraphs(3)}`;
    },
  },
  DISCLOSURE_RESPONSE: {
    sourceChannel: RiuSourceChannel.CAMPAIGN,
    generateDetails: () => {
      return `Annual conflict of interest disclosure:\n\n${faker.lorem.paragraph()}`;
    },
  },
  // ... other types
};

export async function seedRius(
  prisma: PrismaClient,
  organizationId: string,
  userIds: string[],
  categoryIds: string[],
): Promise<string[]> {
  faker.seed(SEED_CONFIG.masterSeed + 2000);

  const riuIds: string[] = [];
  const batches: any[][] = [];
  let currentBatch: any[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < SEED_CONFIG.volumes.rius; i++) {
    const riuType = weightedRandom(
      Object.entries(SEED_CONFIG.distributions.riuTypes).map(([type, weight]) => ({
        value: type as RiuType,
        weight,
      }))
    );

    const template = RIU_TYPE_TEMPLATES[riuType] || RIU_TYPE_TEMPLATES.WEB_FORM_SUBMISSION;
    const createdAt = generateHistoricalDate({ recentBias: 0.35 });

    const riu = {
      id: faker.string.uuid(),
      organizationId,
      referenceNumber: generateReferenceNumber('RIU', createdAt, i),
      type: riuType,
      sourceChannel: template.sourceChannel,
      reporterType: weightedRandom([
        { value: RiuReporterType.ANONYMOUS, weight: 60 },
        { value: RiuReporterType.CONFIDENTIAL, weight: 25 },
        { value: RiuReporterType.IDENTIFIED, weight: 15 },
      ]),
      details: template.generateDetails(),
      summary: faker.lorem.sentence(),
      severity: weightedRandom([
        { value: Severity.HIGH, weight: 15 },
        { value: Severity.MEDIUM, weight: 55 },
        { value: Severity.LOW, weight: 30 },
      ]),
      status: 'RELEASED',
      categoryId: faker.helpers.arrayElement(categoryIds),
      anonymousAccessCode: faker.string.alphanumeric(12).toUpperCase(),
      createdAt,
      createdById: faker.helpers.arrayElement(userIds),
    };

    riuIds.push(riu.id);
    currentBatch.push(riu);

    if (currentBatch.length >= BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Insert batches with progress
  for (let i = 0; i < batches.length; i++) {
    await prisma.riskIntelligenceUnit.createMany({ data: batches[i] });
  }

  return riuIds;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| faker.js (archived) | @faker-js/faker | 2022 | Community maintained, active development |
| Manual SQL seeds | Prisma seed.ts | 2021 | Type-safe, transaction support |
| moment.js | date-fns | 2020 | Lighter, immutable, tree-shakeable |
| Prisma auto-seed on migrate | Explicit `prisma db seed` | Prisma v7 (2025) | More control, explicit invocation |

**Deprecated/outdated:**
- `faker` (original package): Abandoned by author in 2022. Use `@faker-js/faker`.
- `moment.js`: Deprecated in favor of date-fns or Temporal API.
- `prisma migrate reset` auto-seeding: Removed in Prisma v7, now explicit.

## Open Questions

1. **AI-Generated Narratives**
   - What we know: PRD mentions AI generates realistic case narratives
   - What's unclear: Should Phase 2 use actual Claude API calls, or pre-generated content?
   - Recommendation: Use faker-generated content for Phase 2; AI enrichment in Phase 5

2. **Campaign Data Complexity**
   - What we know: Need "multiple completed disclosure campaigns"
   - What's unclear: Campaign entity not yet defined in Phase 1 (depends on Phase 4)
   - Recommendation: Seed basic campaign structure in Phase 2, enhance after Phase 4

3. **Demo Reset Scope**
   - What we know: Single command should reset demo
   - What's unclear: Reset transactional data only, or also org structure/users?
   - Recommendation: Reset transactional data (Cases, RIUs, Investigations); preserve org structure, users, and categories

4. **Sales Rep Personal Instances (DEMO-08)**
   - What we know: Each sales rep should be able to create personal demo instance
   - What's unclear: Architecture for multi-instance demos
   - Recommendation: Start with single Acme Co.; extend to cloning in later slice

## Sources

### Primary (HIGH confidence)
- [Faker.js Seeding API](https://fakerjs.dev/api/faker#seed) - Deterministic data generation
- [Prisma Seeding Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) - Official seed patterns
- [@faker-js/faker npm](https://www.npmjs.com/package/@faker-js/faker) - Current version 9.x confirmed
- [date-fns Documentation](https://date-fns.org/) - Date manipulation utilities

### Secondary (MEDIUM confidence)
- [Seeding NestJs with Prisma And Faker](https://dev.to/100lvlmaster/seeding-nestjs-with-prisma-and-faker-2fgn) - NestJS integration patterns
- [K2view Synthetic Data Generation](https://www.k2view.com/blog/best-synthetic-data-generation-tools/) - Entity-based architecture patterns
- [Multi-tenant Cloud Deployment Guide](https://northflank.com/blog/multi-tenant-cloud-deployment) - Demo provisioning patterns
- [ClickIT Multi-tenant SaaS Architecture](https://www.clickittech.com/software-development/multi-tenant-architecture/) - Tenant isolation patterns

### Tertiary (LOW confidence - needs validation)
- Prisma v7 migration requirements - Changes to auto-seeding behavior
- nest-commander patterns - CLI command structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm, well-documented
- Architecture: HIGH - Patterns align with existing project structure and PRD
- Pitfalls: HIGH - Based on common issues with seed data generation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable patterns)

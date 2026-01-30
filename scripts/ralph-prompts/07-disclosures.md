# Ralph Prompt: Disclosures Management Module

You are implementing the Disclosures module for COI, Gifts & Entertainment, and Outside Activities.

## Context
- Reference: `02-MODULES/06-DISCLOSURES/PRD.md`
- Disclosures are living artifacts with lifecycle, versioning, conditions
- Uses Form Builder for configurable forms
- Campaign engine for periodic collection

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i disclosure
```

## Requirements

### 1. Disclosure Schema

```prisma
model Disclosure {
  id                String   @id @default(uuid())
  organizationId    String

  // Type and form
  type              DisclosureType
  formTemplateId    String?
  formVersion       Int?

  // Submitter
  submittedById     String
  submittedBy       User     @relation(fields: [submittedById], references: [id])
  employeeId        String?
  employee          Employee? @relation(fields: [employeeId], references: [id])

  // Status
  status            DisclosureStatus @default(DRAFT)
  statusChangedAt   DateTime?
  statusChangedById String?

  // Content (form submission data)
  data              Json     // Encrypted sensitive fields

  // Narrative (AI-first)
  summary           String?
  aiSummary         String?
  aiSummaryGeneratedAt DateTime?

  // Versioning (for annual renewals)
  version           Int      @default(1)
  parentDisclosureId String?
  parentDisclosure  Disclosure? @relation("DisclosureVersions", fields: [parentDisclosureId], references: [id])
  renewals          Disclosure[] @relation("DisclosureVersions")

  // Review
  reviewedById      String?
  reviewedBy        User?    @relation("DisclosureReviewer", fields: [reviewedById], references: [id])
  reviewedAt        DateTime?
  reviewDecision    ReviewDecision?
  reviewComments    String?

  // Conditions (if approved with conditions)
  conditions        DisclosureCondition[]

  // Linked cases (if disclosure triggers investigation)
  linkedCaseId      String?

  // Campaign (if part of campaign)
  campaignId        String?
  campaign          DisclosureCampaign? @relation(fields: [campaignId], references: [id])

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId, type, status])
  @@index([submittedById])
  @@index([campaignId])
}

model DisclosureCondition {
  id                String   @id @default(uuid())
  disclosureId      String
  disclosure        Disclosure @relation(fields: [disclosureId], references: [id])

  // Condition details
  description       String
  dueDate           DateTime?
  status            ConditionStatus @default(PENDING)

  // Tracking
  completedAt       DateTime?
  completedById     String?
  completionNotes   String?

  // Reminders
  reminderSentAt    DateTime?
  reminderCount     Int      @default(0)

  createdAt         DateTime @default(now())
  createdById       String

  @@index([disclosureId])
}

model DisclosureCampaign {
  id                String   @id @default(uuid())
  organizationId    String

  // Campaign details
  name              String
  description       String?
  type              DisclosureType
  formTemplateId    String

  // Targeting
  targetAudience    Json     // { businessUnits: [], departments: [], roles: [] }
  targetEmployeeCount Int?

  // Timeline
  startDate         DateTime
  dueDate           DateTime
  reminderSchedule  Json?    // [{ daysBefore: 7 }, { daysBefore: 1 }]

  // Status
  status            CampaignStatus @default(DRAFT)
  launchedAt        DateTime?
  launchedById      String?
  closedAt          DateTime?

  // Progress tracking
  disclosures       Disclosure[]

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String

  @@index([organizationId, status])
}

enum DisclosureType {
  CONFLICT_OF_INTEREST
  GIFTS_ENTERTAINMENT
  OUTSIDE_EMPLOYMENT
  POLITICAL_ACTIVITY
  FINANCIAL_INTEREST
  FAMILY_RELATIONSHIP
  OTHER
}

enum DisclosureStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  APPROVED_WITH_CONDITIONS
  DENIED
  WITHDRAWN
  EXPIRED
  SUPERSEDED  // When renewed
}

enum ReviewDecision {
  APPROVED
  APPROVED_WITH_CONDITIONS
  DENIED
  ESCALATED
  NEEDS_MORE_INFO
}

enum ConditionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
  WAIVED
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}
```

### 2. Disclosure Service

```typescript
@Injectable()
export class DisclosureService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
    private activityService: ActivityService,
    private notificationService: NotificationService,
  ) {}

  // CRUD
  async create(orgId: string, dto: CreateDisclosureDto, userId: string): Promise<Disclosure> { }
  async findAll(orgId: string, query: DisclosureQueryDto): Promise<PaginatedResult<Disclosure>> { }
  async findOne(id: string): Promise<Disclosure> { }
  async update(id: string, dto: UpdateDisclosureDto, userId: string): Promise<Disclosure> { }

  // Submission
  async submit(id: string, userId: string): Promise<Disclosure> {
    const disclosure = await this.findOne(id);

    if (disclosure.status !== 'DRAFT') {
      throw new BadRequestException('Only drafts can be submitted');
    }

    const updated = await this.prisma.disclosure.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        statusChangedAt: new Date(),
        statusChangedById: userId,
      },
    });

    // Generate AI summary
    await this.generateAISummary(id);

    // Notify reviewers
    await this.notificationService.notifyDisclosureSubmitted(updated);

    await this.activityService.log({
      entityType: 'DISCLOSURE',
      entityId: id,
      action: 'submitted',
      actionDescription: `Disclosure submitted for review`,
      actorUserId: userId,
      organizationId: disclosure.organizationId,
    });

    return updated;
  }

  // Review workflow
  async assignReviewer(id: string, reviewerId: string, assignedById: string): Promise<void> { }

  async review(id: string, decision: ReviewDecision, comments: string, conditions?: CreateConditionDto[], reviewerId: string): Promise<Disclosure> {
    const disclosure = await this.findOne(id);

    const updateData: any = {
      status: this.mapDecisionToStatus(decision),
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewDecision: decision,
      reviewComments: comments,
      statusChangedAt: new Date(),
      statusChangedById: reviewerId,
    };

    // If approved with conditions, create conditions
    if (decision === 'APPROVED_WITH_CONDITIONS' && conditions) {
      await this.prisma.disclosureCondition.createMany({
        data: conditions.map(c => ({
          disclosureId: id,
          description: c.description,
          dueDate: c.dueDate,
          createdById: reviewerId,
        })),
      });
    }

    const updated = await this.prisma.disclosure.update({
      where: { id },
      data: updateData,
    });

    // Notify submitter
    await this.notificationService.notifyDisclosureReviewed(updated);

    await this.activityService.log({
      entityType: 'DISCLOSURE',
      entityId: id,
      action: 'reviewed',
      actionDescription: `Disclosure ${decision.toLowerCase().replace('_', ' ')} by reviewer`,
      actorUserId: reviewerId,
      organizationId: disclosure.organizationId,
    });

    return updated;
  }

  // Conditions
  async completeCondition(conditionId: string, notes: string, userId: string): Promise<void> { }

  // Renewal (annual COI)
  async createRenewal(originalId: string, userId: string): Promise<Disclosure> {
    const original = await this.findOne(originalId);

    // Mark original as superseded
    await this.prisma.disclosure.update({
      where: { id: originalId },
      data: { status: 'SUPERSEDED' },
    });

    // Create new version with copied data
    return this.prisma.disclosure.create({
      data: {
        organizationId: original.organizationId,
        type: original.type,
        formTemplateId: original.formTemplateId,
        submittedById: userId,
        employeeId: original.employeeId,
        data: original.data, // Pre-fill with last year's data
        version: original.version + 1,
        parentDisclosureId: originalId,
        status: 'DRAFT',
      },
    });
  }

  // AI Summary
  async generateAISummary(id: string): Promise<string> {
    const disclosure = await this.findOne(id);

    const prompt = `Summarize this ${disclosure.type} disclosure in 2-3 sentences for compliance review:

${JSON.stringify(disclosure.data, null, 2)}

Focus on:
- Key relationships or conflicts
- Potential risks
- Recommended actions`;

    const response = await this.aiProvider.summarize(prompt, {
      organizationId: disclosure.organizationId,
      entityType: 'DISCLOSURE',
      entityId: id,
      style: 'brief',
    });

    await this.prisma.disclosure.update({
      where: { id },
      data: {
        aiSummary: response,
        aiSummaryGeneratedAt: new Date(),
      },
    });

    return response;
  }

  // Conflict detection (AI)
  async detectConflicts(employeeId: string, newDisclosureData: any): Promise<ConflictResult[]> {
    // Get employee's existing disclosures
    const existing = await this.prisma.disclosure.findMany({
      where: {
        employeeId,
        status: { in: ['APPROVED', 'APPROVED_WITH_CONDITIONS'] },
      },
    });

    // Use AI to detect potential conflicts
    const prompt = `Analyze these disclosures for potential conflicts:

Existing disclosures:
${JSON.stringify(existing.map(d => d.data), null, 2)}

New disclosure:
${JSON.stringify(newDisclosureData, null, 2)}

Identify any conflicts of interest, overlapping relationships, or concerns.`;

    const response = await this.aiProvider.generateStructured(prompt, conflictSchema, {
      organizationId: existing[0]?.organizationId,
    });

    return response;
  }
}
```

### 3. Campaign Service

```typescript
@Injectable()
export class DisclosureCampaignService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private employeeService: EmployeeService,
  ) {}

  async create(orgId: string, dto: CreateCampaignDto, userId: string): Promise<DisclosureCampaign> { }

  async launch(campaignId: string, userId: string): Promise<DisclosureCampaign> {
    const campaign = await this.findOne(campaignId);

    // Get target employees
    const employees = await this.employeeService.findByAudience(
      campaign.organizationId,
      campaign.targetAudience,
    );

    // Create draft disclosures for each employee
    await this.prisma.disclosure.createMany({
      data: employees.map(emp => ({
        organizationId: campaign.organizationId,
        type: campaign.type,
        formTemplateId: campaign.formTemplateId,
        submittedById: emp.userId,
        employeeId: emp.id,
        campaignId: campaignId,
        status: 'DRAFT',
      })),
    });

    // Update campaign status
    const updated = await this.prisma.disclosureCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        launchedAt: new Date(),
        launchedById: userId,
        targetEmployeeCount: employees.length,
      },
    });

    // Send launch notifications
    await this.notificationService.notifyCampaignLaunched(updated, employees);

    return updated;
  }

  async getProgress(campaignId: string): Promise<CampaignProgress> {
    const campaign = await this.findOne(campaignId);

    const stats = await this.prisma.disclosure.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    return {
      total: campaign.targetEmployeeCount,
      submitted: stats.find(s => s.status !== 'DRAFT')?._count || 0,
      approved: stats.find(s => s.status === 'APPROVED')?._count || 0,
      pending: stats.find(s => s.status === 'DRAFT')?._count || 0,
      // ... other stats
    };
  }

  async sendReminders(campaignId: string): Promise<void> { }
}
```

### 4. Controller

```typescript
@Controller('api/v1/disclosures')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DisclosureController {
  // CRUD
  @Get()
  async findAll(@TenantId() orgId: string, @Query() query: DisclosureQueryDto) { }

  @Post()
  async create(@Body() dto: CreateDisclosureDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Get(':id')
  async findOne(@Param('id') id: string) { }

  // Workflow
  @Post(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: User) { }

  @Post(':id/review')
  @Roles(UserRole.COMPLIANCE_OFFICER)
  async review(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: User) { }

  @Post(':id/renew')
  async renew(@Param('id') id: string, @CurrentUser() user: User) { }

  // Conditions
  @Post('conditions/:conditionId/complete')
  async completeCondition(@Param('conditionId') id: string, @Body() dto: CompleteConditionDto) { }

  // AI
  @Get(':id/conflicts')
  async detectConflicts(@Param('id') id: string) { }
}

@Controller('api/v1/disclosure-campaigns')
@UseGuards(JwtAuthGuard, TenantGuard)
@Roles(UserRole.COMPLIANCE_OFFICER)
export class DisclosureCampaignController {
  @Get()
  async findAll(@TenantId() orgId: string) { }

  @Post()
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Post(':id/launch')
  async launch(@Param('id') id: string, @CurrentUser() user: User) { }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string) { }

  @Post(':id/send-reminders')
  async sendReminders(@Param('id') id: string) { }
}
```

### 5. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="disclosure"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] Disclosure schema with all fields
- [ ] DisclosureCondition tracking
- [ ] DisclosureCampaign for bulk collection
- [ ] Full review workflow (submit, review, conditions)
- [ ] Renewal creates new version
- [ ] AI summary generation
- [ ] AI conflict detection
- [ ] Campaign launch creates disclosures
- [ ] Campaign progress tracking
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When disclosures module is complete:
<promise>DISCLOSURES COMPLETE</promise>

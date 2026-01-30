# Ralph Prompt: Policy Management Module

You are implementing the Policy Management module for policy lifecycle management.

## Context
- Reference: `02-MODULES/09-POLICY-MANAGEMENT/PRD.md`
- Features: Creation, approval workflows, distribution, attestations, translations
- AI features: Policy generation, auto-tagging, summarization
- 16 major features in the PRD

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i policy
```

## Requirements

### 1. Policy Schema

```prisma
model Policy {
  id                String   @id @default(uuid())
  organizationId    String

  // Identification
  policyNumber      String   // ORG-POL-001
  title             String
  slug              String

  // Classification
  type              PolicyType
  category          String
  subcategory       String?
  tags              String[]

  // Content
  content           String   // Rich text (HTML/Markdown)
  summary           String?
  aiSummary         String?
  aiSummaryGeneratedAt DateTime?

  // Status & Lifecycle
  status            PolicyStatus @default(DRAFT)
  effectiveDate     DateTime?
  expirationDate    DateTime?
  reviewDate        DateTime?  // Next review due

  // Versioning
  version           Int      @default(1)
  versionLabel      String?  // "2.1", "2024 Q1"
  parentPolicyId    String?
  parentPolicy      Policy?  @relation("PolicyVersions", fields: [parentPolicyId], references: [id])
  versions          Policy[] @relation("PolicyVersions")
  changeLog         String?  // What changed in this version

  // Ownership
  ownerId           String
  owner             User     @relation("PolicyOwner", fields: [ownerId], references: [id])
  departmentId      String?

  // Approval
  approvalWorkflowId String?
  approvalStatus    ApprovalStatus?
  approvedAt        DateTime?
  approvedById      String?

  // Regulatory
  regulatoryFrameworks String[]  // ['SOX', 'GDPR', 'HIPAA']
  complianceRequirements Json?

  // AI enrichment
  aiTags            String[]
  aiTagsGeneratedAt DateTime?
  aiModelVersion    String?

  // Migration
  sourceSystem      String?
  sourceRecordId    String?
  migratedAt        DateTime?

  // Relations
  translations      PolicyTranslation[]
  attestations      PolicyAttestation[]
  distributions     PolicyDistribution[]
  exceptions        PolicyException[]
  attachments       PolicyAttachment[]

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String
  updatedById       String?

  @@unique([organizationId, policyNumber, version])
  @@index([organizationId, status])
  @@index([organizationId, category])
  @@index([ownerId])
}

model PolicyTranslation {
  id                String   @id @default(uuid())
  policyId          String
  policy            Policy   @relation(fields: [policyId], references: [id])

  language          String
  title             String
  content           String
  summary           String?

  // AI translation metadata
  aiTranslatedAt    DateTime?
  aiModelVersion    String?
  isReviewed        Boolean  @default(false)
  reviewedById      String?
  reviewedAt        DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([policyId, language])
}

model PolicyAttestation {
  id                String   @id @default(uuid())
  organizationId    String
  policyId          String
  policy            Policy   @relation(fields: [policyId], references: [id])

  // Who
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  employeeId        String?

  // Attestation
  attestedAt        DateTime
  attestationType   AttestationType @default(ACKNOWLEDGED)

  // Quiz (if required)
  quizScore         Float?
  quizPassed        Boolean?
  quizAttempts      Int      @default(1)

  // Campaign
  campaignId        String?
  campaign          AttestationCampaign? @relation(fields: [campaignId], references: [id])

  // Metadata
  ipAddress         String?
  userAgent         String?

  @@unique([policyId, userId, campaignId])
  @@index([organizationId, policyId])
  @@index([userId])
  @@index([campaignId])
}

model AttestationCampaign {
  id                String   @id @default(uuid())
  organizationId    String

  name              String
  description       String?

  // Target policies
  policyIds         String[]

  // Target audience
  targetAudience    Json     // { businessUnits, departments, roles }
  targetCount       Int?

  // Timeline
  startDate         DateTime
  dueDate           DateTime
  reminderSchedule  Json?

  // Quiz settings
  requireQuiz       Boolean  @default(false)
  quizPassingScore  Float?   @default(80)

  // Status
  status            CampaignStatus @default(DRAFT)
  launchedAt        DateTime?
  closedAt          DateTime?

  // Progress
  attestations      PolicyAttestation[]

  createdAt         DateTime @default(now())
  createdById       String

  @@index([organizationId, status])
}

model PolicyException {
  id                String   @id @default(uuid())
  organizationId    String
  policyId          String
  policy            Policy   @relation(fields: [policyId], references: [id])

  // Requester
  requestedById     String
  requestedBy       User     @relation(fields: [requestedById], references: [id])

  // Exception details
  reason            String
  businessJustification String
  riskMitigation    String?
  scope             String?  // Who/what is covered

  // Timeline
  requestedAt       DateTime @default(now())
  effectiveFrom     DateTime
  effectiveUntil    DateTime

  // Approval
  status            ExceptionStatus @default(PENDING)
  approvedById      String?
  approvedAt        DateTime?
  approverComments  String?

  // Renewal
  isRenewable       Boolean  @default(false)
  renewalReminder   DateTime?

  createdAt         DateTime @default(now())

  @@index([organizationId, policyId])
  @@index([status])
}

model PolicyDistribution {
  id                String   @id @default(uuid())
  organizationId    String
  policyId          String
  policy            Policy   @relation(fields: [policyId], references: [id])

  // Distribution details
  distributedAt     DateTime @default(now())
  distributedById   String
  method            DistributionMethod
  targetAudience    Json

  // Stats
  recipientCount    Int
  viewCount         Int      @default(0)
  attestationCount  Int      @default(0)

  @@index([organizationId, policyId])
}

enum PolicyType {
  POLICY
  PROCEDURE
  GUIDELINE
  STANDARD
  CODE_OF_CONDUCT
}

enum PolicyStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PUBLISHED
  ARCHIVED
  SUPERSEDED
}

enum ApprovalStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}

enum AttestationType {
  ACKNOWLEDGED
  READ_AND_UNDERSTOOD
  QUIZ_PASSED
  CERTIFIED
}

enum ExceptionStatus {
  PENDING
  APPROVED
  DENIED
  EXPIRED
  REVOKED
}

enum DistributionMethod {
  EMAIL
  PORTAL
  PUSH_NOTIFICATION
  ALL
}
```

### 2. Policy Service

```typescript
@Injectable()
export class PolicyService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
    private activityService: ActivityService,
  ) {}

  // CRUD
  async create(orgId: string, dto: CreatePolicyDto, userId: string): Promise<Policy> {
    const policyNumber = await this.generatePolicyNumber(orgId);

    const policy = await this.prisma.policy.create({
      data: {
        organizationId: orgId,
        policyNumber,
        ...dto,
        createdById: userId,
        ownerId: dto.ownerId || userId,
      },
    });

    await this.activityService.log({
      entityType: 'POLICY',
      entityId: policy.id,
      action: 'created',
      actionDescription: `Policy "${policy.title}" created`,
      actorUserId: userId,
      organizationId: orgId,
    });

    return policy;
  }

  async findAll(orgId: string, query: PolicyQueryDto): Promise<PaginatedResult<Policy>> { }
  async findOne(id: string): Promise<Policy> { }
  async update(id: string, dto: UpdatePolicyDto, userId: string): Promise<Policy> { }

  // Publishing workflow
  async submitForApproval(id: string, userId: string): Promise<Policy> { }
  async approve(id: string, userId: string, comments?: string): Promise<Policy> { }
  async reject(id: string, userId: string, comments: string): Promise<Policy> { }
  async publish(id: string, userId: string): Promise<Policy> { }

  // Versioning
  async createNewVersion(id: string, userId: string): Promise<Policy> {
    const current = await this.findOne(id);

    // Mark current as superseded when new version is published
    const newVersion = await this.prisma.policy.create({
      data: {
        organizationId: current.organizationId,
        policyNumber: current.policyNumber,
        title: current.title,
        slug: current.slug,
        type: current.type,
        category: current.category,
        content: current.content,
        version: current.version + 1,
        parentPolicyId: current.id,
        status: 'DRAFT',
        ownerId: current.ownerId,
        createdById: userId,
      },
    });

    return newVersion;
  }

  // AI Features
  async generatePolicy(orgId: string, dto: GeneratePolicyDto, userId: string): Promise<Policy> {
    const prompt = `Generate a comprehensive ${dto.type} policy for the following:

Topic: ${dto.topic}
Industry: ${dto.industry || 'general'}
Regulatory requirements: ${dto.regulatoryFrameworks?.join(', ') || 'none specified'}
Target audience: ${dto.targetAudience || 'all employees'}

Additional context:
${dto.additionalContext || 'None'}

Generate a professional policy document with:
1. Purpose and scope
2. Definitions
3. Policy statements
4. Procedures
5. Responsibilities
6. Exceptions process
7. Related documents
8. Review schedule`;

    const response = await this.aiProvider.generateText(prompt, {
      organizationId: orgId,
      entityType: 'POLICY',
      systemPrompt: 'You are an expert compliance policy writer. Generate clear, comprehensive, and enforceable policies.',
    });

    // Create policy with AI-generated content
    return this.create(orgId, {
      title: dto.title || `${dto.topic} Policy`,
      type: dto.type,
      category: dto.category,
      content: response.content,
      tags: dto.tags,
    }, userId);
  }

  async generateSummary(id: string): Promise<string> {
    const policy = await this.findOne(id);

    const summary = await this.aiProvider.summarize(policy.content, {
      organizationId: policy.organizationId,
      entityType: 'POLICY',
      entityId: id,
      style: 'brief',
    });

    await this.prisma.policy.update({
      where: { id },
      data: {
        aiSummary: summary,
        aiSummaryGeneratedAt: new Date(),
      },
    });

    return summary;
  }

  async autoTag(id: string): Promise<string[]> {
    const policy = await this.findOne(id);

    const prompt = `Analyze this policy and suggest relevant tags (max 10):

Title: ${policy.title}
Content: ${policy.content.substring(0, 5000)}

Return tags as a JSON array of strings.`;

    const response = await this.aiProvider.generateStructured(prompt, {
      type: 'array',
      items: { type: 'string' },
    }, {
      organizationId: policy.organizationId,
      entityType: 'POLICY',
      entityId: id,
    });

    await this.prisma.policy.update({
      where: { id },
      data: {
        aiTags: response,
        aiTagsGeneratedAt: new Date(),
      },
    });

    return response;
  }

  async translate(id: string, targetLanguage: string): Promise<PolicyTranslation> {
    const policy = await this.findOne(id);

    const translatedContent = await this.aiProvider.translate(policy.content, targetLanguage, {
      organizationId: policy.organizationId,
      entityType: 'POLICY',
      entityId: id,
      preserveFormatting: true,
    });

    const translatedTitle = await this.aiProvider.translate(policy.title, targetLanguage, {
      organizationId: policy.organizationId,
    });

    return this.prisma.policyTranslation.create({
      data: {
        policyId: id,
        language: targetLanguage,
        title: translatedTitle,
        content: translatedContent,
        aiTranslatedAt: new Date(),
        aiModelVersion: 'claude-3-5-sonnet',
      },
    });
  }

  async generateQuiz(id: string, questionCount: number = 5): Promise<QuizQuestion[]> {
    const policy = await this.findOne(id);

    const prompt = `Generate ${questionCount} multiple choice quiz questions to test understanding of this policy:

${policy.content}

For each question, provide:
- question: The question text
- options: Array of 4 possible answers
- correctAnswer: Index of correct answer (0-3)
- explanation: Brief explanation of why

Return as JSON array.`;

    return this.aiProvider.generateStructured(prompt, quizSchema, {
      organizationId: policy.organizationId,
      entityType: 'POLICY',
      entityId: id,
    });
  }
}
```

### 3. Attestation Service

```typescript
@Injectable()
export class AttestationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Record attestation
  async attest(policyId: string, userId: string, type: AttestationType, quizResult?: QuizResult): Promise<PolicyAttestation> { }

  // Campaign management
  async createCampaign(orgId: string, dto: CreateCampaignDto, userId: string): Promise<AttestationCampaign> { }
  async launchCampaign(campaignId: string, userId: string): Promise<AttestationCampaign> { }
  async getCampaignProgress(campaignId: string): Promise<CampaignProgress> { }
  async sendReminders(campaignId: string): Promise<void> { }

  // Reporting
  async getAttestationReport(orgId: string, policyId?: string): Promise<AttestationReport> { }
  async getMissingAttestations(orgId: string, policyId: string): Promise<User[]> { }
}
```

### 4. Exception Service

```typescript
@Injectable()
export class PolicyExceptionService {
  // Request exception
  async requestException(policyId: string, dto: RequestExceptionDto, userId: string): Promise<PolicyException> { }

  // Approve/deny
  async approve(exceptionId: string, userId: string, comments?: string): Promise<PolicyException> { }
  async deny(exceptionId: string, userId: string, comments: string): Promise<PolicyException> { }

  // Renewal
  async requestRenewal(exceptionId: string, userId: string): Promise<PolicyException> { }

  // Expiration handling
  async processExpiringExceptions(): Promise<void> { }
}
```

### 5. Controllers

```typescript
@Controller('api/v1/policies')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PolicyController {
  // CRUD
  @Get()
  async findAll(@TenantId() orgId: string, @Query() query: PolicyQueryDto) { }

  @Post()
  @Roles(UserRole.POLICY_AUTHOR, UserRole.COMPLIANCE_OFFICER)
  async create(@Body() dto: CreatePolicyDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Get(':id')
  async findOne(@Param('id') id: string) { }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyDto, @CurrentUser() user: User) { }

  // Workflow
  @Post(':id/submit-for-approval')
  async submitForApproval(@Param('id') id: string, @CurrentUser() user: User) { }

  @Post(':id/approve')
  @Roles(UserRole.POLICY_REVIEWER, UserRole.COMPLIANCE_OFFICER)
  async approve(@Param('id') id: string, @CurrentUser() user: User) { }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: User) { }

  // Versioning
  @Post(':id/new-version')
  async createVersion(@Param('id') id: string, @CurrentUser() user: User) { }

  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string) { }

  // AI features
  @Post('generate')
  async generatePolicy(@Body() dto: GeneratePolicyDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Post(':id/summarize')
  async summarize(@Param('id') id: string) { }

  @Post(':id/auto-tag')
  async autoTag(@Param('id') id: string) { }

  @Post(':id/translate/:language')
  async translate(@Param('id') id: string, @Param('language') lang: string) { }

  @Post(':id/generate-quiz')
  async generateQuiz(@Param('id') id: string, @Query('count') count: number) { }

  // Attestations
  @Post(':id/attest')
  async attest(@Param('id') id: string, @Body() dto: AttestDto, @CurrentUser() user: User) { }

  @Get(':id/attestations')
  async getAttestations(@Param('id') id: string) { }

  // Exceptions
  @Post(':id/exceptions')
  async requestException(@Param('id') id: string, @Body() dto: RequestExceptionDto, @CurrentUser() user: User) { }
}
```

### 6. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="policy"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] Policy schema with versioning
- [ ] PolicyTranslation with AI support
- [ ] PolicyAttestation and campaigns
- [ ] PolicyException workflow
- [ ] Full CRUD operations
- [ ] Approval workflow
- [ ] AI policy generation
- [ ] AI summarization and tagging
- [ ] AI translation
- [ ] Quiz generation
- [ ] Attestation campaigns
- [ ] Exception management
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When policy management is fully functional:
<promise>POLICY MANAGEMENT COMPLETE</promise>

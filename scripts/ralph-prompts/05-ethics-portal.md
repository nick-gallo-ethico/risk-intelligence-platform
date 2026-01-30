# Ralph Prompt: Ethics Portal & Employee Portal Module

You are implementing the dual-portal system for employee-facing functionality.

## Context
- Reference: `02-MODULES/03-ETHICS-PORTAL/PRD.md`
- Two tiers:
  - **Ethics Portal**: Public, no auth, anonymous reporting
  - **Employee Portal**: Authenticated, self-service for cases/disclosures/policies

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/frontend && ls -la src/pages/
```

## Requirements

### 1. Public Ethics Portal (No Auth)

#### Anonymous Report Submission
```prisma
model AnonymousReport {
  id                String   @id @default(uuid())
  organizationId    String

  // Access
  accessCode        String   @unique  // 12-char code for reporter to check status
  accessCodeHash    String            // Hashed for security

  // Report content
  category          String
  subcategory       String?
  description       String
  incidentDate      DateTime?
  incidentLocation  String?

  // Optional contact (still anonymous)
  preferredContactMethod String?  // 'portal', 'email', 'phone'
  contactEmail      String?       // Encrypted
  contactPhone      String?       // Encrypted

  // Files
  attachments       AnonymousAttachment[]

  // Processing
  status            AnonymousReportStatus @default(SUBMITTED)
  linkedCaseId      String?  // Set when converted to case

  // Messages (two-way anonymous)
  messages          AnonymousMessage[]

  submittedAt       DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId])
  @@index([accessCode])
}

model AnonymousMessage {
  id                String   @id @default(uuid())
  reportId          String
  report            AnonymousReport @relation(fields: [reportId], references: [id])

  direction         Direction  // INBOUND (reporter) or OUTBOUND (compliance)
  content           String
  isRead            Boolean  @default(false)

  sentAt            DateTime @default(now())
  sentById          String?  // Null for reporter messages

  @@index([reportId])
}

enum AnonymousReportStatus {
  SUBMITTED
  UNDER_REVIEW
  ADDITIONAL_INFO_REQUESTED
  CONVERTED_TO_CASE
  CLOSED
}
```

#### Public Portal Service
```typescript
@Injectable()
export class EthicsPortalService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  // Submit anonymous report (no auth required)
  async submitReport(orgSlug: string, dto: SubmitReportDto): Promise<{ accessCode: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    const accessCode = this.generateAccessCode();

    await this.prisma.anonymousReport.create({
      data: {
        organizationId: org.id,
        accessCode,
        accessCodeHash: await this.cryptoService.hash(accessCode),
        category: dto.category,
        description: dto.description,
        // Encrypt contact info if provided
        contactEmail: dto.contactEmail
          ? await this.cryptoService.encrypt(dto.contactEmail)
          : null,
      },
    });

    return { accessCode };
  }

  // Check report status (with access code)
  async getReportStatus(accessCode: string): Promise<ReportStatusDto> { }

  // Get messages (with access code)
  async getMessages(accessCode: string): Promise<AnonymousMessage[]> { }

  // Send message (reporter side)
  async sendMessage(accessCode: string, content: string): Promise<void> { }

  private generateAccessCode(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars
  }
}
```

#### Public Portal Controller (No Auth)
```typescript
@Controller('api/v1/public/ethics-portal')
export class EthicsPortalController {
  // Get organization info (for branding)
  @Get(':orgSlug')
  async getPortalInfo(@Param('orgSlug') orgSlug: string) { }

  // Submit anonymous report
  @Post(':orgSlug/reports')
  async submitReport(
    @Param('orgSlug') orgSlug: string,
    @Body() dto: SubmitReportDto,
  ) { }

  // Check status with access code
  @Get('reports/:accessCode/status')
  async getStatus(@Param('accessCode') accessCode: string) { }

  // Get messages
  @Get('reports/:accessCode/messages')
  async getMessages(@Param('accessCode') accessCode: string) { }

  // Send message
  @Post('reports/:accessCode/messages')
  async sendMessage(
    @Param('accessCode') accessCode: string,
    @Body() dto: SendMessageDto,
  ) { }
}
```

### 2. Employee Portal (Authenticated)

#### Employee Portal Service
```typescript
@Injectable()
export class EmployeePortalService {
  constructor(
    private prisma: PrismaService,
    private casesService: CasesService,
    private disclosureService: DisclosureService,
    private policyService: PolicyService,
  ) {}

  // My Cases (cases I reported)
  async getMyCases(employeeId: string, orgId: string): Promise<Case[]> { }

  // My Disclosures
  async getMyDisclosures(employeeId: string, orgId: string): Promise<Disclosure[]> { }

  // Pending disclosure campaigns
  async getPendingCampaigns(employeeId: string, orgId: string): Promise<DisclosureCampaign[]> { }

  // Policies requiring attestation
  async getPendingAttestations(employeeId: string, orgId: string): Promise<Policy[]> { }

  // Submit attestation
  async submitAttestation(employeeId: string, policyId: string): Promise<void> { }

  // Manager view - team disclosures (if manager)
  async getTeamDisclosures(managerId: string, orgId: string): Promise<Disclosure[]> { }

  // Policy Q&A (via AI)
  async askPolicyQuestion(
    employeeId: string,
    orgId: string,
    question: string,
  ): Promise<PolicyAnswer> { }
}
```

#### Employee Portal Controller
```typescript
@Controller('api/v1/employee-portal')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmployeePortalController {
  // Dashboard
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: User, @TenantId() orgId: string) { }

  // My cases
  @Get('my-cases')
  async getMyCases(@CurrentUser() user: User, @TenantId() orgId: string) { }

  @Get('my-cases/:id')
  async getCase(@Param('id') id: string, @CurrentUser() user: User) { }

  // My disclosures
  @Get('my-disclosures')
  async getMyDisclosures(@CurrentUser() user: User, @TenantId() orgId: string) { }

  // Campaigns
  @Get('pending-campaigns')
  async getPendingCampaigns(@CurrentUser() user: User, @TenantId() orgId: string) { }

  // Policies
  @Get('policies')
  async getPolicies(@TenantId() orgId: string) { }

  @Get('pending-attestations')
  async getPendingAttestations(@CurrentUser() user: User, @TenantId() orgId: string) { }

  @Post('policies/:id/attest')
  async attestPolicy(@Param('id') id: string, @CurrentUser() user: User) { }

  // Policy Q&A
  @Post('policy-qa')
  async askQuestion(@Body() dto: AskQuestionDto, @CurrentUser() user: User) { }

  // Manager - Team view
  @Get('team/disclosures')
  @Roles(UserRole.MANAGER)
  async getTeamDisclosures(@CurrentUser() user: User, @TenantId() orgId: string) { }
}
```

### 3. Organization Public Profile
Add to Organization model:
```prisma
model Organization {
  // ... existing fields

  // Public portal config
  slug              String   @unique
  publicPortalEnabled Boolean @default(true)
  publicPortalBranding Json?  // { logo, colors, welcomeMessage }
  reportingCategories String[] // Categories shown on public form
}
```

### 4. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="ethics-portal|employee-portal"
cd apps/backend && npm run typecheck
```

Test cases:
- Anonymous report submission works without auth
- Access code provides report status
- Two-way messaging works
- Employee portal requires auth
- Employees only see their own cases
- Manager sees team disclosures
- Policy Q&A calls AI service

## Verification Checklist
- [ ] AnonymousReport schema with messages
- [ ] Public portal endpoints work without auth
- [ ] Access code generation and validation
- [ ] Contact info encrypted at rest
- [ ] Employee portal dashboard complete
- [ ] My cases/disclosures filtered correctly
- [ ] Attestation submission works
- [ ] Policy Q&A with AI integration
- [ ] Manager team view with role check
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When both portals are functional:
<promise>ETHICS PORTAL COMPLETE</promise>

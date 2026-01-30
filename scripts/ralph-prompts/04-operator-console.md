# Ralph Prompt: Operator Console Module

You are implementing the Operator Console module - the internal tool for Ethico hotline operators.

## Context
- Reference: `02-MODULES/02-OPERATOR-CONSOLE/PRD.md`
- This is for INTERNAL Ethico staff, not client users
- Handles: Hotline intake, AI-assisted note cleanup, QA review workflow
- Depends on: Case Management module

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i operator
```

## Requirements

### 1. Client Profile Schema

```prisma
model ClientProfile {
  id                String   @id @default(uuid())
  organizationId    String   // The client organization
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Display info
  displayName       String
  legalName         String?
  industry          String?
  employeeCount     Int?

  // Hotline configuration
  hotlineNumbers    String[] // Phone numbers routed to this client
  defaultLanguage   String   @default("en")
  supportedLanguages String[]
  timezone          String   @default("America/New_York")

  // Greeting script
  greetingScript    String?
  customQuestions   Json?    // Additional intake questions

  // Escalation rules
  escalationContacts Json?   // { critical: [...], high: [...] }
  autoNotifyOnSeverity Severity?

  // Active directives
  directives        Directive[]

  // Status
  isActive          Boolean  @default(true)
  onboardedAt       DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId])
}

model Directive {
  id                String   @id @default(uuid())
  clientProfileId   String
  clientProfile     ClientProfile @relation(fields: [clientProfileId], references: [id])

  // Directive content
  title             String
  content           String
  priority          Priority @default(NORMAL)
  category          String?  // 'intake', 'routing', 'escalation', 'special'

  // Validity
  effectiveFrom     DateTime @default(now())
  effectiveUntil    DateTime?
  isActive          Boolean  @default(true)

  // Audit
  createdAt         DateTime @default(now())
  createdById       String

  @@index([clientProfileId, isActive])
}
```

### 2. Intake Session Schema

```prisma
model IntakeSession {
  id                String   @id @default(uuid())

  // Operator context (Ethico internal)
  operatorId        String   // Ethico operator user
  operator          User     @relation(fields: [operatorId], references: [id])

  // Client context
  clientProfileId   String
  clientProfile     ClientProfile @relation(fields: [clientProfileId], references: [id])

  // Call metadata
  callId            String?  // Phone system call ID
  callStartedAt     DateTime @default(now())
  callEndedAt       DateTime?
  callDuration      Int?     // seconds

  // Intake progress
  status            IntakeStatus @default(IN_PROGRESS)

  // Raw notes (before AI cleanup)
  rawNotes          String?

  // AI-cleaned notes
  cleanedNotes      String?
  aiCleanupAppliedAt DateTime?
  aiCleanupModelVersion String?

  // Created case (if submitted)
  caseId            String?  @unique
  case              Case?    @relation(fields: [caseId], references: [id])

  // QA
  requiresQA        Boolean  @default(true)
  qaStatus          QAStatus?
  qaReviewerId      String?
  qaReviewedAt      DateTime?
  qaComments        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([operatorId])
  @@index([clientProfileId])
  @@index([status])
  @@index([qaStatus])
}

enum IntakeStatus {
  IN_PROGRESS
  SUBMITTED_FOR_QA
  QA_APPROVED
  QA_REJECTED
  RELEASED_TO_CLIENT
  CANCELLED
}

enum QAStatus {
  PENDING
  IN_REVIEW
  APPROVED
  NEEDS_REVISION
  REJECTED
}
```

### 3. Operator Service
Create `apps/backend/src/modules/operator-console/`:

#### operator-console.service.ts
```typescript
@Injectable()
export class OperatorConsoleService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
    private casesService: CasesService,
    private activityService: ActivityService,
  ) {}

  // Client profile management
  async getClientProfile(clientId: string): Promise<ClientProfile> { }
  async getActiveDirectives(clientId: string): Promise<Directive[]> { }

  // Intake workflow
  async startIntake(operatorId: string, clientId: string, callId?: string): Promise<IntakeSession> { }
  async updateRawNotes(sessionId: string, notes: string): Promise<IntakeSession> { }
  async applyAICleanup(sessionId: string): Promise<IntakeSession> { }
  async submitForQA(sessionId: string): Promise<IntakeSession> { }

  // QA workflow
  async getQAQueue(): Promise<IntakeSession[]> { }
  async assignQAReviewer(sessionId: string, reviewerId: string): Promise<void> { }
  async approveQA(sessionId: string, reviewerId: string, comments?: string): Promise<void> { }
  async rejectQA(sessionId: string, reviewerId: string, comments: string): Promise<void> { }
  async releaseToClient(sessionId: string): Promise<Case> { }

  // AI note cleanup
  private async cleanupNotes(rawNotes: string, clientProfile: ClientProfile): Promise<string> {
    const prompt = `Clean up these hotline intake notes for a compliance case.
Client: ${clientProfile.displayName}
Industry: ${clientProfile.industry}

Rules:
- Fix grammar and spelling
- Organize into clear paragraphs
- Remove filler words
- Preserve all factual details exactly
- Flag any unclear or ambiguous statements with [VERIFY]
- Maintain reporter anonymity

Raw notes:
${rawNotes}`;

    const response = await this.aiProvider.generateText(prompt, {
      organizationId: clientProfile.organizationId,
      entityType: 'INTAKE_SESSION',
      systemPrompt: 'You are an expert compliance documentation specialist.',
    });

    return response.content;
  }
}
```

### 4. Operator Dashboard Endpoints

```typescript
@Controller('api/v1/operator')
@UseGuards(JwtAuthGuard, InternalUserGuard) // Ethico staff only
export class OperatorConsoleController {
  // Dashboard
  @Get('dashboard')
  async getDashboard(@CurrentUser() operator: User) { }

  // Client search
  @Get('clients')
  async searchClients(@Query('q') query: string) { }

  @Get('clients/:id')
  async getClientProfile(@Param('id') clientId: string) { }

  @Get('clients/:id/directives')
  async getDirectives(@Param('id') clientId: string) { }

  // Intake
  @Post('intake/start')
  async startIntake(@Body() dto: StartIntakeDto) { }

  @Put('intake/:id/notes')
  async updateNotes(@Param('id') id: string, @Body() dto: UpdateNotesDto) { }

  @Post('intake/:id/ai-cleanup')
  async applyAICleanup(@Param('id') id: string) { }

  @Post('intake/:id/submit-qa')
  async submitForQA(@Param('id') id: string) { }

  // QA
  @Get('qa/queue')
  async getQAQueue() { }

  @Post('qa/:id/approve')
  async approveQA(@Param('id') id: string, @Body() dto: QADecisionDto) { }

  @Post('qa/:id/reject')
  async rejectQA(@Param('id') id: string, @Body() dto: QADecisionDto) { }

  @Post('qa/:id/release')
  async releaseToClient(@Param('id') id: string) { }
}
```

### 5. Internal User Guard
Create guard that only allows Ethico internal operators:

```typescript
@Injectable()
export class InternalUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    // Check if user belongs to Ethico internal organization
    return user.organization.isEthicoInternal === true;
  }
}
```

### 6. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="operator"
cd apps/backend && npm run typecheck
```

Test cases:
- Only internal operators can access
- AI cleanup improves note quality
- QA workflow state transitions work
- Released cases appear in client organization
- Activity logged throughout workflow

## Verification Checklist
- [ ] ClientProfile schema with directives
- [ ] IntakeSession schema with QA workflow
- [ ] OperatorConsoleService with all methods
- [ ] AI note cleanup working
- [ ] QA approve/reject workflow
- [ ] Release creates case in client org
- [ ] InternalUserGuard protects endpoints
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When operator console is fully functional:
<promise>OPERATOR CONSOLE COMPLETE</promise>

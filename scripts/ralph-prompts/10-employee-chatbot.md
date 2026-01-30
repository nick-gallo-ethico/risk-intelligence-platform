# Ralph Prompt: Employee Chatbot Module

You are implementing the AI-powered Employee Chatbot for natural language interactions.

## Context
- Reference: `02-MODULES/08-EMPLOYEE-CHATBOT/PRD.md`
- Conversational interface for: speak-up reporting, policy Q&A, case status, disclosure help
- Uses Claude API with RAG for policy knowledge base
- Tiered confidence: high-confidence answers vs. escalation

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i chat
```

## Requirements

### 1. Chatbot Schema

```prisma
model ChatSession {
  id                String   @id @default(uuid())
  organizationId    String

  // User context (can be anonymous)
  userId            String?
  user              User?    @relation(fields: [userId], references: [id])
  isAnonymous       Boolean  @default(false)
  anonymousSessionId String? // For anonymous users

  // Session metadata
  channel           ChatChannel @default(WEB)
  language          String   @default("en")
  startedAt         DateTime @default(now())
  endedAt           DateTime?
  lastActivityAt    DateTime @default(now())

  // Context
  currentIntent     String?  // 'speak_up', 'policy_qa', 'case_status', etc.
  contextData       Json?    // Accumulated context from conversation

  // Messages
  messages          ChatMessage[]

  // Linked entities (created from chat)
  linkedCaseId      String?
  linkedDisclosureId String?

  // Feedback
  satisfactionRating Int?    // 1-5
  feedbackComment   String?

  @@index([organizationId, userId])
  @@index([anonymousSessionId])
}

model ChatMessage {
  id                String   @id @default(uuid())
  sessionId         String
  session           ChatSession @relation(fields: [sessionId], references: [id])

  // Message content
  role              MessageRole
  content           String
  contentType       ContentType @default(TEXT)

  // AI metadata (for assistant messages)
  intent            String?
  confidence        Float?   // 0-1, for AI responses
  sources           Json?    // Policy/document references
  suggestedActions  Json?    // [{ action, label, payload }]

  // Structured data (for forms, selections)
  structuredData    Json?

  // Moderation
  wasModerated      Boolean  @default(false)
  moderationReason  String?

  createdAt         DateTime @default(now())

  @@index([sessionId])
}

model PolicyKnowledgeBase {
  id                String   @id @default(uuid())
  organizationId    String

  // Source
  sourceType        KnowledgeSourceType
  sourceId          String   // policyId, documentId, etc.
  sourceTitle       String

  // Content chunks for RAG
  chunks            KnowledgeChunk[]

  // Sync status
  lastSyncedAt      DateTime
  syncStatus        SyncStatus @default(PENDING)

  @@unique([organizationId, sourceType, sourceId])
  @@index([organizationId])
}

model KnowledgeChunk {
  id                String   @id @default(uuid())
  knowledgeBaseId   String
  knowledgeBase     PolicyKnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)

  // Content
  content           String
  chunkIndex        Int

  // Embeddings for semantic search
  embedding         Unsupported("vector(1536)")?

  // Metadata
  sectionTitle      String?
  pageNumber        Int?

  @@index([knowledgeBaseId])
}

model ChatbotConfig {
  id                String   @id @default(uuid())
  organizationId    String   @unique

  // Personality
  botName           String   @default("Ethics Assistant")
  welcomeMessage    String?
  fallbackMessage   String?

  // Capabilities
  enableSpeakUp     Boolean  @default(true)
  enablePolicyQA    Boolean  @default(true)
  enableCaseStatus  Boolean  @default(true)
  enableDisclosureHelp Boolean @default(true)

  // Confidence thresholds
  highConfidenceThreshold Float @default(0.85)
  escalationThreshold Float @default(0.5)

  // Escalation
  escalationEmail   String?
  escalationMessage String?

  // Languages
  supportedLanguages String[] @default(["en"])

  // Hours
  availableHours    Json?    // { start: "09:00", end: "17:00", timezone: "EST" }

  updatedAt         DateTime @updatedAt
}

enum ChatChannel {
  WEB
  MOBILE
  SLACK
  TEAMS
  EMAIL
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum ContentType {
  TEXT
  FORM
  CARD
  LIST
  ACTION_BUTTONS
}

enum KnowledgeSourceType {
  POLICY
  FAQ
  PROCEDURE
  TRAINING_MATERIAL
  CUSTOM_DOCUMENT
}

enum SyncStatus {
  PENDING
  SYNCING
  COMPLETED
  FAILED
}
```

### 2. Chatbot Service

```typescript
@Injectable()
export class ChatbotService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
    private knowledgeService: KnowledgeBaseService,
    private casesService: CasesService,
    private disclosureService: DisclosureService,
    private policyService: PolicyService,
  ) {}

  // Session management
  async createSession(orgId: string, userId?: string, channel: ChatChannel = 'WEB'): Promise<ChatSession> { }
  async getSession(sessionId: string): Promise<ChatSession> { }
  async endSession(sessionId: string, rating?: number, feedback?: string): Promise<void> { }

  // Core chat
  async processMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    const session = await this.getSession(sessionId);
    const config = await this.getConfig(session.organizationId);

    // Save user message
    await this.saveMessage(sessionId, {
      role: 'USER',
      content: userMessage,
    });

    // Detect intent
    const intent = await this.detectIntent(userMessage, session.contextData);

    // Route to appropriate handler
    let response: ChatResponse;
    switch (intent.type) {
      case 'speak_up':
        response = await this.handleSpeakUp(session, userMessage, intent);
        break;
      case 'policy_question':
        response = await this.handlePolicyQuestion(session, userMessage, config);
        break;
      case 'case_status':
        response = await this.handleCaseStatus(session, userMessage);
        break;
      case 'disclosure_help':
        response = await this.handleDisclosureHelp(session, userMessage);
        break;
      case 'general':
      default:
        response = await this.handleGeneral(session, userMessage, config);
    }

    // Check confidence for escalation
    if (response.confidence < config.escalationThreshold) {
      response = await this.escalateToHuman(session, response);
    }

    // Save assistant message
    return this.saveMessage(sessionId, {
      role: 'ASSISTANT',
      content: response.content,
      intent: intent.type,
      confidence: response.confidence,
      sources: response.sources,
      suggestedActions: response.suggestedActions,
    });
  }

  // Intent detection
  private async detectIntent(message: string, context: any): Promise<Intent> {
    const prompt = `Classify the user's intent from this message:

Message: "${message}"
Previous context: ${JSON.stringify(context)}

Possible intents:
- speak_up: User wants to report a concern, ethics issue, or speak up
- policy_question: User is asking about company policies
- case_status: User wants to check status of existing case
- disclosure_help: User needs help with disclosures (COI, gifts, etc.)
- general: General question or greeting

Return JSON: { "type": "intent_type", "confidence": 0.0-1.0, "entities": {} }`;

    return this.aiProvider.generateStructured(prompt, intentSchema, {
      organizationId: context.organizationId,
    });
  }

  // Speak-up flow (guided)
  private async handleSpeakUp(session: ChatSession, message: string, intent: Intent): Promise<ChatResponse> {
    const currentStep = session.contextData?.speakUpStep || 'start';

    switch (currentStep) {
      case 'start':
        return {
          content: "I understand you want to report a concern. I'll help you through this process confidentially. First, can you briefly describe what type of concern this is?",
          suggestedActions: [
            { action: 'select', label: 'Harassment/Discrimination', payload: { category: 'harassment' } },
            { action: 'select', label: 'Fraud/Financial', payload: { category: 'fraud' } },
            { action: 'select', label: 'Safety Concern', payload: { category: 'safety' } },
            { action: 'select', label: 'Policy Violation', payload: { category: 'policy' } },
            { action: 'select', label: 'Other', payload: { category: 'other' } },
          ],
          confidence: 1.0,
          nextStep: 'category_selected',
        };

      case 'category_selected':
        // Continue guided flow...
        return this.continueSpeakUpFlow(session, message);

      case 'details':
        // Collect details
        return this.collectSpeakUpDetails(session, message);

      case 'confirm':
        // Create case
        const caseEntity = await this.createCaseFromChat(session);
        return {
          content: `Thank you for reporting this concern. Your case reference number is ${caseEntity.caseNumber}. Would you like to receive updates? You can check status anytime by asking me.`,
          confidence: 1.0,
          linkedCaseId: caseEntity.id,
        };
    }
  }

  // Policy Q&A with RAG
  private async handlePolicyQuestion(session: ChatSession, question: string, config: ChatbotConfig): Promise<ChatResponse> {
    // Search knowledge base
    const relevantChunks = await this.knowledgeService.search(
      session.organizationId,
      question,
      5, // top K
    );

    if (relevantChunks.length === 0) {
      return {
        content: "I couldn't find specific policy information about that. Would you like me to connect you with the compliance team?",
        confidence: 0.3,
        suggestedActions: [
          { action: 'escalate', label: 'Contact Compliance Team' },
          { action: 'rephrase', label: 'Ask Another Way' },
        ],
      };
    }

    // Generate answer with context
    const context = relevantChunks.map(c => c.content).join('\n\n');
    const sources = relevantChunks.map(c => ({
      title: c.knowledgeBase.sourceTitle,
      type: c.knowledgeBase.sourceType,
      id: c.knowledgeBase.sourceId,
    }));

    const prompt = `Answer this policy question using ONLY the provided context.

Question: ${question}

Context from company policies:
${context}

Rules:
- Only answer based on the provided context
- If the context doesn't fully answer the question, say so
- Be concise but complete
- Cite which policy the information comes from
- If unsure, recommend speaking with compliance`;

    const response = await this.aiProvider.generateText(prompt, {
      organizationId: session.organizationId,
      entityType: 'CHAT_SESSION',
      entityId: session.id,
      temperature: 0.3, // Lower for factual accuracy
    });

    // Estimate confidence based on context relevance
    const confidence = this.estimateConfidence(relevantChunks);

    return {
      content: response.content,
      confidence,
      sources,
      suggestedActions: confidence < config.highConfidenceThreshold
        ? [{ action: 'escalate', label: 'Speak with Compliance' }]
        : undefined,
    };
  }

  // Case status check
  private async handleCaseStatus(session: ChatSession, message: string): Promise<ChatResponse> {
    if (!session.userId) {
      return {
        content: "To check your case status, I'll need to verify your identity. Do you have a case reference number?",
        confidence: 1.0,
        suggestedActions: [
          { action: 'input', label: 'Enter Case Number' },
          { action: 'login', label: 'Log In to View Cases' },
        ],
      };
    }

    // Get user's cases
    const cases = await this.casesService.findByReporter(session.userId, session.organizationId);

    if (cases.length === 0) {
      return {
        content: "I don't see any cases associated with your account. If you submitted anonymously, you can check using your access code.",
        confidence: 1.0,
      };
    }

    // Format case list
    const caseList = cases.map(c => ({
      caseNumber: c.caseNumber,
      status: c.status,
      lastUpdate: c.updatedAt,
    }));

    return {
      content: `Here are your cases:\n\n${caseList.map(c => `• **${c.caseNumber}**: ${c.status}`).join('\n')}\n\nWould you like details on any specific case?`,
      confidence: 1.0,
      structuredData: { type: 'case_list', cases: caseList },
    };
  }

  // Escalation
  private async escalateToHuman(session: ChatSession, response: ChatResponse): Promise<ChatResponse> {
    // Log escalation
    await this.activityService.log({
      entityType: 'CHAT_SESSION',
      entityId: session.id,
      action: 'escalated',
      actionDescription: 'Chat escalated to human due to low confidence',
      organizationId: session.organizationId,
    });

    return {
      ...response,
      content: response.content + "\n\nI'm not fully confident in this answer. Would you like me to connect you with our compliance team for a more detailed response?",
      suggestedActions: [
        { action: 'escalate', label: 'Yes, connect me' },
        { action: 'continue', label: 'No, this helps' },
      ],
    };
  }
}
```

### 3. Knowledge Base Service

```typescript
@Injectable()
export class KnowledgeBaseService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  // Index policy for RAG
  async indexPolicy(policyId: string): Promise<void> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    // Create or update knowledge base entry
    const kb = await this.prisma.policyKnowledgeBase.upsert({
      where: {
        organizationId_sourceType_sourceId: {
          organizationId: policy.organizationId,
          sourceType: 'POLICY',
          sourceId: policyId,
        },
      },
      create: {
        organizationId: policy.organizationId,
        sourceType: 'POLICY',
        sourceId: policyId,
        sourceTitle: policy.title,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCING',
      },
      update: {
        sourceTitle: policy.title,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCING',
      },
    });

    // Delete existing chunks
    await this.prisma.knowledgeChunk.deleteMany({
      where: { knowledgeBaseId: kb.id },
    });

    // Chunk content
    const chunks = this.chunkContent(policy.content);

    // Generate embeddings and save chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.aiProvider.generateEmbeddings([chunks[i].content]);

      await this.prisma.knowledgeChunk.create({
        data: {
          knowledgeBaseId: kb.id,
          content: chunks[i].content,
          chunkIndex: i,
          sectionTitle: chunks[i].sectionTitle,
          embedding: embedding[0],
        },
      });
    }

    // Update sync status
    await this.prisma.policyKnowledgeBase.update({
      where: { id: kb.id },
      data: { syncStatus: 'COMPLETED' },
    });
  }

  // Semantic search
  async search(orgId: string, query: string, topK: number = 5): Promise<KnowledgeChunk[]> {
    // Generate query embedding
    const queryEmbedding = await this.aiProvider.generateEmbeddings([query]);

    // Vector similarity search
    const results = await this.prisma.$queryRaw`
      SELECT kc.*, kb.source_title, kb.source_type, kb.source_id,
             1 - (kc.embedding <=> ${queryEmbedding[0]}::vector) as similarity
      FROM "KnowledgeChunk" kc
      JOIN "PolicyKnowledgeBase" kb ON kc.knowledge_base_id = kb.id
      WHERE kb.organization_id = ${orgId}
      ORDER BY kc.embedding <=> ${queryEmbedding[0]}::vector
      LIMIT ${topK}
    `;

    return results;
  }

  // Chunk content into smaller pieces
  private chunkContent(content: string, maxChunkSize: number = 500): ChunkResult[] {
    // Split by sections/paragraphs
    const sections = content.split(/\n#{1,3}\s+/);
    const chunks: ChunkResult[] = [];

    for (const section of sections) {
      if (section.length <= maxChunkSize) {
        chunks.push({ content: section, sectionTitle: this.extractTitle(section) });
      } else {
        // Further split large sections
        const subChunks = this.splitByParagraphs(section, maxChunkSize);
        chunks.push(...subChunks);
      }
    }

    return chunks;
  }
}
```

### 4. Controller

```typescript
@Controller('api/v1/chatbot')
export class ChatbotController {
  // Public endpoints (for anonymous chat)
  @Post(':orgSlug/sessions')
  async createSession(
    @Param('orgSlug') orgSlug: string,
    @Body() dto: CreateSessionDto,
  ) { }

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) { }

  @Get('sessions/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) { }

  @Post('sessions/:sessionId/end')
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: EndSessionDto,
  ) { }

  // Authenticated endpoints
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getMySessions(@CurrentUser() user: User) { }

  // Admin endpoints
  @Get('admin/sessions')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles(UserRole.COMPLIANCE_OFFICER)
  async getAllSessions(@TenantId() orgId: string, @Query() query: SessionQueryDto) { }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles(UserRole.COMPLIANCE_OFFICER)
  async getAnalytics(@TenantId() orgId: string) { }

  // Config
  @Get('admin/config')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getConfig(@TenantId() orgId: string) { }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  async updateConfig(@TenantId() orgId: string, @Body() dto: UpdateConfigDto) { }

  // Knowledge base
  @Post('admin/knowledge/sync')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async syncKnowledgeBase(@TenantId() orgId: string) { }
}
```

### 5. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="chatbot|knowledge"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] ChatSession and ChatMessage schemas
- [ ] KnowledgeBase with vector embeddings
- [ ] ChatbotConfig per organization
- [ ] Intent detection working
- [ ] Speak-up guided flow
- [ ] Policy Q&A with RAG
- [ ] Case status check
- [ ] Confidence-based escalation
- [ ] Knowledge base indexing
- [ ] Semantic search working
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When chatbot is fully functional:
<promise>EMPLOYEE CHATBOT COMPLETE</promise>

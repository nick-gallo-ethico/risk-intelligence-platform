# Ralph Prompt: AI Integration Service

You are implementing the AI integration service with Claude API support.

## Context
- Reference: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Primary provider: Anthropic Claude API
- Must support provider abstraction for future Azure OpenAI or self-hosted
- CRITICAL: Never mix data from multiple tenants in AI prompts

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat .env.example | grep -i anthropic
```

## Requirements

### 1. AI Provider Interface
Create `apps/backend/src/modules/ai/interfaces/ai-provider.interface.ts`:

```typescript
export interface AIProvider {
  // Text generation
  generateText(prompt: string, options?: AIOptions): Promise<AIResponse>;

  // Structured outputs
  generateStructured<T>(prompt: string, schema: object, options?: AIOptions): Promise<T>;

  // Summarization
  summarize(content: string, options?: SummarizeOptions): Promise<string>;

  // Translation
  translate(content: string, targetLanguage: string, options?: TranslateOptions): Promise<string>;

  // Embeddings (for semantic search)
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  organizationId: string;  // REQUIRED for audit
  userId?: string;
  entityType?: string;
  entityId?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: { input: number; output: number };
  finishReason: string;
}

export interface SummarizeOptions extends AIOptions {
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet_points';
}

export interface TranslateOptions extends AIOptions {
  preserveFormatting?: boolean;
  glossary?: Record<string, string>;
}
```

### 2. Claude Provider Implementation
Create `apps/backend/src/modules/ai/providers/claude.provider.ts`:

```typescript
@Injectable()
export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(
    private configService: ConfigService,
    private aiConversationService: AIConversationService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  async generateText(prompt: string, options: AIOptions): Promise<AIResponse> {
    // Validate single-tenant context
    if (!options.organizationId) {
      throw new Error('organizationId required for AI operations');
    }

    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const result: AIResponse = {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      finishReason: response.stop_reason || 'end_turn',
    };

    // Log conversation for audit
    await this.aiConversationService.log({
      organizationId: options.organizationId,
      userId: options.userId,
      entityType: options.entityType,
      entityId: options.entityId,
      userPrompt: prompt,
      aiResponse: result.content,
      modelVersion: result.model,
      tokensInput: result.tokensUsed.input,
      tokensOutput: result.tokensUsed.output,
      latencyMs: Date.now() - startTime,
    });

    return result;
  }

  async summarize(content: string, options: SummarizeOptions): Promise<string> {
    const styleInstructions = {
      brief: 'Provide a 2-3 sentence summary.',
      detailed: 'Provide a comprehensive summary with key points.',
      bullet_points: 'Summarize as bullet points.',
    };

    const prompt = `Summarize the following content. ${styleInstructions[options.style || 'brief']}

Content:
${content}`;

    const response = await this.generateText(prompt, {
      ...options,
      systemPrompt: 'You are an expert summarizer. Be concise and accurate.',
    });

    return response.content;
  }

  async translate(content: string, targetLanguage: string, options: TranslateOptions): Promise<string> {
    let prompt = `Translate the following to ${targetLanguage}. Preserve the original meaning and tone.`;

    if (options.preserveFormatting) {
      prompt += ' Maintain all formatting, headings, and structure.';
    }

    if (options.glossary) {
      prompt += `\n\nUse these term translations:\n${JSON.stringify(options.glossary, null, 2)}`;
    }

    prompt += `\n\nContent:\n${content}`;

    const response = await this.generateText(prompt, {
      ...options,
      systemPrompt: 'You are an expert translator specializing in compliance and legal documents.',
    });

    return response.content;
  }

  // ... implement other methods
}
```

### 3. AI Conversation Logging
Create `apps/backend/src/modules/ai/ai-conversation.service.ts`:

```typescript
@Injectable()
export class AIConversationService {
  constructor(private prisma: PrismaService) {}

  async log(data: CreateAIConversationDto): Promise<AIConversation> {
    return this.prisma.aIConversation.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        userPrompt: data.userPrompt,
        aiResponse: data.aiResponse,
        modelVersion: data.modelVersion,
        tokensInput: data.tokensInput,
        tokensOutput: data.tokensOutput,
        latencyMs: data.latencyMs,
      },
    });
  }

  async markHelpful(id: string, wasHelpful: boolean): Promise<void> {
    await this.prisma.aIConversation.update({
      where: { id },
      data: { wasHelpful },
    });
  }
}
```

### 4. AI Conversation Schema
Add to Prisma schema:

```prisma
model AIConversation {
  id              String   @id @default(uuid())
  organizationId  String

  // Context
  entityType      String?  // 'CASE', 'POLICY', etc.
  entityId        String?
  userId          String?

  // Conversation
  userPrompt      String
  aiResponse      String

  // Metadata
  modelVersion    String
  tokensInput     Int
  tokensOutput    Int
  latencyMs       Int?

  // Feedback
  wasHelpful      Boolean?

  createdAt       DateTime @default(now())

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt])
}
```

### 5. AI Module
Create `apps/backend/src/modules/ai/ai.module.ts`:

```typescript
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    ClaudeProvider,
    AIConversationService,
    {
      provide: 'AI_PROVIDER',
      useClass: ClaudeProvider,
    },
  ],
  exports: ['AI_PROVIDER', AIConversationService],
})
export class AIModule {}
```

### 6. Rate Limiting & Cost Control
Add rate limiting middleware for AI endpoints:
- Per-organization daily token limits
- Per-user request limits
- Cost tracking per organization

### 7. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="ai"
cd apps/backend && npm run typecheck
```

Test cases:
- AI requests require organizationId
- Conversations are logged with correct tenant
- Rate limiting works per organization
- Provider abstraction allows swapping implementations

## Verification Checklist
- [ ] AIProvider interface defined
- [ ] ClaudeProvider implements interface
- [ ] All AI calls require organizationId
- [ ] Conversations logged to AIConversation table
- [ ] Token usage tracked per organization
- [ ] Rate limiting configured
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When AI service is complete with logging and rate limiting:
<promise>AI INTEGRATION COMPLETE</promise>

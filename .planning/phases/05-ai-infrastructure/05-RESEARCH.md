# Phase 5: AI Infrastructure - Research

**Researched:** 2026-02-03
**Domain:** AI integration, Claude API, agent architecture, tool use, streaming, tenant isolation
**Confidence:** HIGH

## Summary

Phase 5 builds the AI integration layer that transforms the Risk Intelligence Platform from a data management tool into an AI-assisted compliance copilot. This research covers Claude API integration via `@anthropic-ai/sdk`, multi-LLM provider abstraction, agent architecture patterns, streaming responses, prompt caching for cost optimization, and tenant-isolated rate limiting.

The key insight is that the AI system should follow a "Claude Code"-like pattern: scoped agents with registered skills, preview-then-execute for destructive actions, and comprehensive undo trails. The existing event bus and BullMQ infrastructure from Phase 1 provide the foundation for async AI processing with retry logic.

**Primary recommendation:** Use `@anthropic-ai/sdk` directly (not LangChain) with a thin provider abstraction layer. Implement skills as registered tool definitions with permission validation. Store all AI conversations and actions for audit, with configurable undo windows based on action severity.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.39+ | Claude API client | Official Anthropic SDK with TypeScript types, streaming, retries |
| ioredis | ^5.x | Rate limiting state | Already in stack from Phase 1 BullMQ; fast atomic counters |
| uuid | ^9.x | Conversation/action IDs | Standard UUID generation |
| zod | ^3.x | Tool input validation | Type-safe schema validation for tool inputs |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/throttler | ^6.x | Rate limiting decorator | API endpoint rate limiting (complements Redis-based tenant limits) |
| handlebars | ^4.x | Prompt templates | Templated prompts with variable injection |
| diff | ^7.x | Change tracking | Generate diffs for preview mode |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct SDK | LangChain | LangChain adds abstraction overhead; direct SDK is simpler and more performant for Claude-first app |
| Direct SDK | Vercel AI SDK | Good for Next.js frontend streaming, but we need backend control; use for frontend only if needed |
| Redis counters | In-memory | Redis survives restarts, works across instances; in-memory doesn't |
| Handlebars | String templates | Handlebars handles conditionals, loops; raw templates get unwieldy |

**Installation:**
```bash
npm install @anthropic-ai/sdk zod handlebars diff
npm install @nestjs/throttler
```

## Architecture Patterns

### Recommended Module Structure

```
apps/backend/src/modules/ai/
├── ai.module.ts                    # Main AI module
├── ai.controller.ts                # REST endpoints for AI panel
├── ai.gateway.ts                   # WebSocket gateway for streaming
├── services/
│   ├── ai-client.service.ts        # Claude API wrapper with tenant context
│   ├── provider-registry.ts        # Multi-LLM provider abstraction
│   ├── context-loader.service.ts   # Hierarchy loading (platform->org->team->user->entity)
│   ├── conversation.service.ts     # Conversation management and persistence
│   └── rate-limiter.service.ts     # Per-tenant rate limiting
├── agents/
│   ├── agent.registry.ts           # Agent type registry
│   ├── base.agent.ts               # Base agent class
│   ├── investigation.agent.ts      # Investigation-scoped agent
│   ├── case.agent.ts               # Case-scoped agent
│   └── compliance-manager.agent.ts # Org-wide agent
├── skills/
│   ├── skill.registry.ts           # Skill registration by scope
│   ├── skill.decorator.ts          # @Skill() decorator
│   ├── platform/                   # Platform-wide skills
│   │   └── note-cleanup.skill.ts
│   │   └── summarize.skill.ts
│   │   └── translate.skill.ts
│   └── entity/                     # Entity-specific skills
│       └── case-summary.skill.ts
│       └── investigation-summary.skill.ts
│       └── risk-score.skill.ts
├── actions/
│   ├── action.catalog.ts           # Action definitions with permissions
│   ├── action-executor.service.ts  # Execute with preview/undo support
│   ├── undo.service.ts             # Undo trail management
│   └── actions/
│       ├── add-note.action.ts
│       ├── change-status.action.ts
│       ├── send-email.action.ts
│       └── workflow-transition.action.ts
├── prompts/
│   ├── prompt.service.ts           # Versioned prompt management
│   ├── templates/                  # Handlebars templates
│   │   ├── system/
│   │   │   └── base.hbs
│   │   │   └── investigation-agent.hbs
│   │   │   └── case-agent.hbs
│   │   └── skills/
│   │       └── summarize.hbs
│   │       └── note-cleanup.hbs
│   └── context-files/              # Organization/user context file handling
│       └── context-file.service.ts
└── dto/
    ├── chat-message.dto.ts
    ├── conversation.dto.ts
    ├── skill-execution.dto.ts
    └── action-preview.dto.ts
```

### Pattern 1: Provider Abstraction for Multi-LLM Support

**What:** Abstract interface that allows swapping LLM providers while maintaining consistent API.

**When to use:** All AI calls go through this interface.

**Example:**
```typescript
// Source: Anthropic SDK documentation + multi-provider pattern
// apps/backend/src/modules/ai/services/provider-registry.ts

export interface AIProvider {
  readonly name: string;

  createMessage(params: {
    model: string;
    maxTokens: number;
    system: string | ContentBlock[];
    messages: Message[];
    tools?: Tool[];
    stream?: boolean;
  }): Promise<MessageResponse>;

  streamMessage(params: {
    model: string;
    maxTokens: number;
    system: string | ContentBlock[];
    messages: Message[];
    tools?: Tool[];
  }): AsyncIterable<StreamEvent>;
}

// apps/backend/src/modules/ai/services/providers/claude.provider.ts

@Injectable()
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  async createMessage(params: CreateMessageParams): Promise<MessageResponse> {
    const response = await this.client.messages.create({
      model: params.model || 'claude-sonnet-4-5',
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });

    return this.transformResponse(response);
  }

  async *streamMessage(params: CreateMessageParams): AsyncIterable<StreamEvent> {
    const stream = this.client.messages.stream({
      model: params.model || 'claude-sonnet-4-5',
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });

    for await (const event of stream) {
      yield this.transformStreamEvent(event);
    }
  }
}
```

### Pattern 2: Context Hierarchy Loading

**What:** Load context from multiple levels (platform, org, team, user, entity) and assemble into system prompt.

**When to use:** Every AI call.

**Example:**
```typescript
// apps/backend/src/modules/ai/services/context-loader.service.ts

@Injectable()
export class ContextLoaderService {
  constructor(
    private prisma: PrismaService,
    private cacheManager: Cache,
  ) {}

  async loadContext(params: {
    organizationId: string;
    userId: string;
    entityType?: string;
    entityId?: string;
    teamId?: string;
  }): Promise<AIContext> {
    // Platform context (cached globally)
    const platformContext = await this.loadPlatformContext();

    // Organization context (cached per org)
    const orgContext = await this.loadOrgContext(params.organizationId);

    // Team context (if applicable)
    const teamContext = params.teamId
      ? await this.loadTeamContext(params.teamId)
      : null;

    // User preferences
    const userContext = await this.loadUserContext(params.userId);

    // Entity context
    const entityContext = params.entityId
      ? await this.loadEntityContext(params.entityType, params.entityId)
      : null;

    return {
      platform: platformContext,
      organization: orgContext,
      team: teamContext,
      user: userContext,
      entity: entityContext,
    };
  }

  private async loadOrgContext(orgId: string): Promise<OrgContext> {
    const cacheKey = `ai:context:org:${orgId}`;

    let context = await this.cacheManager.get<OrgContext>(cacheKey);
    if (context) return context;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        aiContextFile: true,
        categories: { select: { id: true, name: true } },
      },
    });

    context = {
      name: org.name,
      contextFile: org.aiContextFile?.content, // CLAUDE.md equivalent
      categories: org.categories,
      terminology: org.terminology,
    };

    await this.cacheManager.set(cacheKey, context, 3600); // 1 hour cache
    return context;
  }

  buildSystemPrompt(context: AIContext, agentType: AgentType): string {
    const template = this.getAgentTemplate(agentType);

    return Handlebars.compile(template)({
      platform: context.platform,
      org: context.organization,
      team: context.team,
      user: context.user,
      entity: context.entity,
      currentDateTime: new Date().toISOString(),
    });
  }
}
```

### Pattern 3: Skill Registry with Scope-Based Registration

**What:** Skills registered at different hierarchy levels, resolved based on agent context.

**When to use:** Skill discovery and execution.

**Example:**
```typescript
// apps/backend/src/modules/ai/skills/skill.registry.ts

export enum SkillScope {
  PLATFORM = 'platform',  // Available everywhere
  ORG = 'org',            // Organization-specific
  TEAM = 'team',          // Team-specific
  USER = 'user',          // User-defined
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  scope: SkillScope;
  scopeId?: string;  // Org/team/user ID if scoped
  entityTypes?: string[];  // Restrict to specific entity types
  requiredPermissions: string[];
  inputSchema: z.ZodType;
  execute: (input: unknown, context: SkillContext) => Promise<SkillResult>;
}

@Injectable()
export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  getAvailableSkills(params: {
    organizationId: string;
    userId: string;
    teamId?: string;
    entityType?: string;
    userPermissions: string[];
  }): SkillDefinition[] {
    return Array.from(this.skills.values())
      .filter(skill => {
        // Check scope
        if (skill.scope === SkillScope.ORG && skill.scopeId !== params.organizationId) {
          return false;
        }
        if (skill.scope === SkillScope.TEAM && skill.scopeId !== params.teamId) {
          return false;
        }
        if (skill.scope === SkillScope.USER && skill.scopeId !== params.userId) {
          return false;
        }

        // Check entity type restriction
        if (skill.entityTypes && !skill.entityTypes.includes(params.entityType)) {
          return false;
        }

        // Check permissions
        return skill.requiredPermissions.every(p =>
          params.userPermissions.includes(p)
        );
      });
  }

  // Convert to Claude tool format
  toClaudeTools(skills: SkillDefinition[]): Tool[] {
    return skills.map(skill => ({
      name: skill.id,
      description: skill.description,
      input_schema: zodToJsonSchema(skill.inputSchema),
    }));
  }
}
```

### Pattern 4: Preview-Then-Execute with Undo Trail

**What:** All destructive actions preview first, execute with undo capability.

**When to use:** AI-initiated actions that modify data.

**Example:**
```typescript
// apps/backend/src/modules/ai/actions/action-executor.service.ts

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  requiredPermissions: string[];
  requiresPreview: boolean;
  undoWindowSeconds: number;  // 0 = non-undoable
  execute: (input: unknown, context: ActionContext) => Promise<ActionResult>;
  generatePreview: (input: unknown, context: ActionContext) => Promise<ActionPreview>;
  undo?: (actionId: string, context: ActionContext) => Promise<void>;
}

@Injectable()
export class ActionExecutorService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async preview(
    actionId: string,
    input: unknown,
    context: ActionContext,
  ): Promise<ActionPreview> {
    const action = this.actionCatalog.get(actionId);

    // Validate permissions
    this.validatePermissions(action, context);

    // Generate preview (diff, description of what will happen)
    return action.generatePreview(input, context);
  }

  async execute(
    actionId: string,
    input: unknown,
    context: ActionContext,
    previewId?: string,  // If coming from preview flow
  ): Promise<ExecutionResult> {
    const action = this.actionCatalog.get(actionId);

    // Create AI action record before execution
    const aiAction = await this.prisma.aiAction.create({
      data: {
        organizationId: context.organizationId,
        conversationId: context.conversationId,
        actionType: actionId,
        input: input as Prisma.JsonObject,
        status: 'EXECUTING',
        actorUserId: context.userId,
        entityType: context.entityType,
        entityId: context.entityId,
        undoWindowSeconds: action.undoWindowSeconds,
        undoExpiresAt: action.undoWindowSeconds > 0
          ? new Date(Date.now() + action.undoWindowSeconds * 1000)
          : null,
      },
    });

    try {
      const result = await action.execute(input, context);

      // Store result and mark complete
      await this.prisma.aiAction.update({
        where: { id: aiAction.id },
        data: {
          status: 'COMPLETED',
          result: result as Prisma.JsonObject,
          completedAt: new Date(),
        },
      });

      // Emit event for activity feed
      this.eventEmitter.emit('ai.action.completed', {
        actionId: aiAction.id,
        organizationId: context.organizationId,
        entityType: context.entityType,
        entityId: context.entityId,
        actionType: actionId,
        actorUserId: context.userId,
      });

      return {
        success: true,
        actionId: aiAction.id,
        result,
        undoAvailable: action.undoWindowSeconds > 0,
        undoExpiresAt: aiAction.undoExpiresAt,
      };
    } catch (error) {
      await this.prisma.aiAction.update({
        where: { id: aiAction.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      throw error;
    }
  }

  async undo(actionId: string, context: ActionContext): Promise<void> {
    const aiAction = await this.prisma.aiAction.findFirst({
      where: {
        id: actionId,
        organizationId: context.organizationId,
        status: 'COMPLETED',
        undoExpiresAt: { gt: new Date() },
      },
    });

    if (!aiAction) {
      throw new Error('Action not found or undo window expired');
    }

    const action = this.actionCatalog.get(aiAction.actionType);
    if (!action.undo) {
      throw new Error('Action is not undoable');
    }

    await action.undo(actionId, context);

    await this.prisma.aiAction.update({
      where: { id: actionId },
      data: {
        status: 'UNDONE',
        undoneAt: new Date(),
        undoneByUserId: context.userId,
      },
    });
  }
}
```

### Pattern 5: Streaming Response via WebSocket

**What:** Real-time streaming of AI responses to frontend via WebSocket.

**When to use:** AI panel chat interface.

**Example:**
```typescript
// apps/backend/src/modules/ai/ai.gateway.ts

@WebSocketGateway({
  namespace: '/ai',
  cors: { origin: '*' },
})
export class AiGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private aiClientService: AiClientService,
    private conversationService: ConversationService,
  ) {}

  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessageDto,
  ): Promise<void> {
    const context = client.data.context; // Set during auth

    // Load conversation history
    const conversation = await this.conversationService.getOrCreate({
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: payload.entityType,
      entityId: payload.entityId,
    });

    // Add user message
    await this.conversationService.addMessage({
      conversationId: conversation.id,
      role: 'user',
      content: payload.content,
    });

    // Stream response
    try {
      client.emit('message_start', { conversationId: conversation.id });

      let fullContent = '';
      const stream = this.aiClientService.streamChat({
        conversationId: conversation.id,
        message: payload.content,
        context,
      });

      for await (const event of stream) {
        if (event.type === 'text_delta') {
          fullContent += event.text;
          client.emit('text_delta', {
            conversationId: conversation.id,
            text: event.text,
          });
        } else if (event.type === 'tool_use') {
          client.emit('tool_use', {
            conversationId: conversation.id,
            toolName: event.name,
            input: event.input,
          });
        }
      }

      // Save assistant message
      await this.conversationService.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: fullContent,
      });

      client.emit('message_complete', { conversationId: conversation.id });
    } catch (error) {
      client.emit('error', {
        conversationId: conversation.id,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('stop')
  async handleStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<void> {
    // Abort the stream if active
    this.aiClientService.abortStream(payload.conversationId);
    client.emit('stopped', { conversationId: payload.conversationId });
  }
}
```

### Pattern 6: Per-Tenant Rate Limiting

**What:** Redis-based rate limiting isolated per organization.

**When to use:** All AI API calls.

**Example:**
```typescript
// apps/backend/src/modules/ai/services/rate-limiter.service.ts

@Injectable()
export class AiRateLimiterService {
  constructor(
    @InjectRedis() private redis: Redis,
    private prisma: PrismaService,
  ) {}

  private getKey(orgId: string, type: 'rpm' | 'tpm'): string {
    return `ai:ratelimit:${orgId}:${type}`;
  }

  async checkAndConsume(params: {
    organizationId: string;
    estimatedTokens: number;
  }): Promise<RateLimitResult> {
    const { organizationId, estimatedTokens } = params;

    // Get org limits (could be from DB or config)
    const limits = await this.getOrgLimits(organizationId);

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // RPM check (requests per minute)
    const rpmKey = this.getKey(organizationId, 'rpm');
    pipeline.zremrangebyscore(rpmKey, 0, windowStart);
    pipeline.zcard(rpmKey);

    // TPM check (tokens per minute)
    const tpmKey = this.getKey(organizationId, 'tpm');
    pipeline.zremrangebyscore(tpmKey, 0, windowStart);
    pipeline.zrangebyscore(tpmKey, windowStart, '+inf', 'WITHSCORES');

    const results = await pipeline.exec();

    const currentRpm = results[1][1] as number;
    const tokenEntries = results[3][1] as string[];
    const currentTpm = this.sumTokens(tokenEntries);

    if (currentRpm >= limits.requestsPerMinute) {
      return {
        allowed: false,
        reason: 'RATE_LIMIT_RPM',
        retryAfterMs: this.calculateRetryAfter(rpmKey),
      };
    }

    if (currentTpm + estimatedTokens > limits.tokensPerMinute) {
      return {
        allowed: false,
        reason: 'RATE_LIMIT_TPM',
        retryAfterMs: this.calculateRetryAfter(tpmKey),
      };
    }

    // Consume
    const requestId = `${now}:${Math.random().toString(36).slice(2)}`;
    await this.redis.pipeline()
      .zadd(rpmKey, now, requestId)
      .expire(rpmKey, 120)
      .zadd(tpmKey, now, `${requestId}:${estimatedTokens}`)
      .expire(tpmKey, 120)
      .exec();

    return {
      allowed: true,
      remaining: {
        rpm: limits.requestsPerMinute - currentRpm - 1,
        tpm: limits.tokensPerMinute - currentTpm - estimatedTokens,
      },
    };
  }

  async recordActualUsage(params: {
    organizationId: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  }): Promise<void> {
    // Store in database for billing/analytics
    await this.prisma.aiUsage.create({
      data: {
        organizationId: params.organizationId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        cacheReadTokens: params.cacheReadTokens || 0,
        cacheWriteTokens: params.cacheWriteTokens || 0,
        timestamp: new Date(),
      },
    });
  }
}
```

### Anti-Patterns to Avoid

- **Mixing tenant data in AI context:** NEVER load data from multiple organizations into the same AI call. Always verify organizationId before loading any entity.

- **Synchronous AI calls in request path:** Always use streaming for user-facing AI or queue for background processing. Never block HTTP requests on AI completion.

- **Storing full prompts in audit logs:** Store conversation IDs and message references, not full prompt text. Full prompts can be reconstructed when needed.

- **Global rate limits instead of per-tenant:** Each organization must have isolated rate limits. A noisy tenant should not affect others.

- **Hardcoding prompts:** Use versioned templates. Prompts will change frequently during iteration.

- **Caching AI responses:** AI responses should be fresh. Cache context loading, not responses.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming SSE parser | Custom event parser | SDK's `.stream()` method | Edge cases with chunking, reconnection |
| Rate limiting | Simple counters | Redis sorted sets + sliding window | Distributed state, atomic operations, accuracy |
| Tool schema validation | Manual JSON validation | Zod with `zodToJsonSchema` | Type safety, runtime validation, schema generation |
| Prompt templating | String concatenation | Handlebars | Conditionals, loops, escaping |
| Retry with backoff | setTimeout loops | BullMQ retry config | Already configured in Phase 1 |
| Diff generation | Custom diffing | `diff` library | Handles edge cases, multiple output formats |
| Token counting | Character estimation | Claude API's token counting endpoint | Accurate billing, rate limit planning |

**Key insight:** The Claude SDK handles most complexity. Focus on business logic (skills, actions, context) rather than API mechanics.

## Common Pitfalls

### Pitfall 1: Prompt Injection via User Input

**What goes wrong:** User content included in prompts without sanitization can manipulate AI behavior.

**Why it happens:** Treating user input as trusted data in prompt construction.

**How to avoid:**
- Always separate system instructions from user content using proper message roles
- Use Claude's structured input format (system vs user messages)
- Never interpolate user input directly into system prompts
- Use prompt caching so system instructions are hashed separately

**Warning signs:** AI behaving unexpectedly, users reporting they can "jailbreak" the AI.

### Pitfall 2: Rate Limit Exhaustion Cascade

**What goes wrong:** One expensive operation exhausts rate limits, causing all subsequent requests to fail.

**Why it happens:** Not tracking tokens before sending requests, not implementing backpressure.

**How to avoid:**
- Estimate tokens BEFORE making API calls
- Implement graceful degradation (queue requests when near limit)
- Set reasonable per-user limits within org limits
- Use token counting API for large content

**Warning signs:** Sudden 429 errors, users reporting AI "doesn't work" intermittently.

### Pitfall 3: Context Window Overflow

**What goes wrong:** Long conversations or large entities exceed context window, causing truncation or errors.

**Why it happens:** Not tracking cumulative token usage across conversation.

**How to avoid:**
- Track token count per conversation
- Implement conversation summarization when approaching limits
- Use prompt caching for stable prefix content
- Consider message pruning strategies (keep system + recent N messages)

**Warning signs:** AI "forgetting" earlier conversation, incomplete responses.

### Pitfall 4: Tool Call Loops

**What goes wrong:** AI calls tools repeatedly without making progress.

**Why it happens:** Ambiguous tool definitions, missing stop conditions.

**How to avoid:**
- Limit tool calls per turn (e.g., max 10)
- Include clear success/failure indicators in tool results
- Log and monitor tool call patterns
- Implement circuit breakers for repeated failures

**Warning signs:** High token usage without user value, stuck conversations.

### Pitfall 5: Undo Window Race Conditions

**What goes wrong:** User requests undo just as window expires, leading to inconsistent state.

**Why it happens:** Checking expiry and executing undo non-atomically.

**How to avoid:**
- Use database transactions for undo operations
- Check expiry within the same transaction that performs undo
- Add small buffer (e.g., 1 second) to undo window checks
- Handle "already undone" and "expired" as distinct error cases

**Warning signs:** Partial undo states, user confusion about what was actually undone.

## Code Examples

### Complete AI Client Service

```typescript
// Source: Anthropic SDK documentation + NestJS patterns
// apps/backend/src/modules/ai/services/ai-client.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private client: Anthropic;
  private activeStreams = new Map<string, AbortController>();

  constructor(
    private configService: ConfigService,
    private contextLoader: ContextLoaderService,
    private skillRegistry: SkillRegistry,
    private rateLimiter: AiRateLimiterService,
    private conversationService: ConversationService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  async *streamChat(params: {
    conversationId: string;
    message: string;
    context: AIContext;
  }): AsyncIterable<StreamEvent> {
    const { conversationId, message, context } = params;

    // Check rate limits
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId: context.organizationId,
      estimatedTokens: this.estimateTokens(message),
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitExceededError(rateLimitResult);
    }

    // Load full context hierarchy
    const aiContext = await this.contextLoader.loadContext({
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: context.entityType,
      entityId: context.entityId,
    });

    // Get conversation history
    const history = await this.conversationService.getMessages(conversationId);

    // Get available skills as tools
    const skills = this.skillRegistry.getAvailableSkills({
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: context.entityType,
      userPermissions: context.permissions,
    });
    const tools = this.skillRegistry.toClaudeTools(skills);

    // Build system prompt with caching
    const systemPrompt = this.contextLoader.buildSystemPrompt(
      aiContext,
      context.agentType,
    );

    // Setup abort controller
    const abortController = new AbortController();
    this.activeStreams.set(conversationId, abortController);

    try {
      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }, // Cache system prompt
          },
        ],
        messages: [
          ...this.formatHistory(history),
          { role: 'user', content: message },
        ],
        tools: tools.length > 0 ? tools : undefined,
      }, {
        signal: abortController.signal,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield { type: 'text_delta', text: event.delta.text };
          } else if (event.delta.type === 'input_json_delta') {
            yield { type: 'tool_input_delta', json: event.delta.partial_json };
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            yield {
              type: 'tool_use_start',
              id: event.content_block.id,
              name: event.content_block.name,
            };
          }
        } else if (event.type === 'message_delta') {
          // Record actual usage
          if (event.usage) {
            await this.rateLimiter.recordActualUsage({
              organizationId: context.organizationId,
              inputTokens: event.usage.input_tokens,
              outputTokens: event.usage.output_tokens,
            });
          }
        }
      }

      // Get final message for tool handling
      const finalMessage = await stream.finalMessage();

      // Handle tool calls
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          yield {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          };

          // Execute skill
          const skillResult = await this.executeSkill(
            block.name,
            block.input,
            context,
          );

          yield {
            type: 'tool_result',
            toolUseId: block.id,
            result: skillResult,
          };
        }
      }
    } finally {
      this.activeStreams.delete(conversationId);
    }
  }

  abortStream(conversationId: string): void {
    const controller = this.activeStreams.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(conversationId);
    }
  }

  private async executeSkill(
    skillId: string,
    input: unknown,
    context: AIContext,
  ): Promise<SkillResult> {
    const skill = this.skillRegistry.get(skillId);
    if (!skill) {
      return { error: `Unknown skill: ${skillId}` };
    }

    try {
      // Validate input
      const validatedInput = skill.inputSchema.parse(input);

      // Execute
      return await skill.execute(validatedInput, {
        organizationId: context.organizationId,
        userId: context.userId,
        entityType: context.entityType,
        entityId: context.entityId,
      });
    } catch (error) {
      this.logger.error(`Skill ${skillId} failed:`, error);
      return { error: error.message };
    }
  }
}
```

### Conversation Persistence

```typescript
// apps/backend/src/modules/ai/services/conversation.service.ts

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(params: {
    organizationId: string;
    userId: string;
    entityType?: string;
    entityId?: string;
  }): Promise<Conversation> {
    // Find active conversation for this entity
    const existing = await this.prisma.aiConversation.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        status: 'ACTIVE',
      },
    });

    if (existing) return existing;

    // Create new conversation
    return this.prisma.aiConversation.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        status: 'ACTIVE',
      },
    });
  }

  async addMessage(params: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
  }): Promise<Message> {
    return this.prisma.aiMessage.create({
      data: {
        conversationId: params.conversationId,
        role: params.role,
        content: params.content,
        toolCalls: params.toolCalls as Prisma.JsonArray,
        toolResults: params.toolResults as Prisma.JsonArray,
      },
    });
  }

  async pause(conversationId: string): Promise<void> {
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });
  }

  async resume(conversationId: string): Promise<void> {
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
      },
    });
  }

  async archive(conversationId: string): Promise<void> {
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
  }

  async generateTitle(conversationId: string): Promise<string> {
    const messages = await this.getMessages(conversationId, 3);

    // Use AI to generate title from first few messages
    // This would call the AI client with a simple summarization prompt
    // For now, return placeholder
    return messages[0]?.content.slice(0, 50) || 'New Conversation';
  }
}
```

### Example Skill: Note Cleanup

```typescript
// apps/backend/src/modules/ai/skills/platform/note-cleanup.skill.ts

import { z } from 'zod';
import { SkillDefinition, SkillScope } from '../skill.registry';

export const noteCleanupInputSchema = z.object({
  content: z.string().describe('The raw note content to clean up'),
  style: z.enum(['light', 'full']).optional().default('light')
    .describe('Light preserves voice, full rewrites completely'),
});

export const noteCleanupSkill: SkillDefinition = {
  id: 'note-cleanup',
  name: 'Clean Up Notes',
  description: 'Transform bullet points and rough notes into formal narrative prose while preserving key information',
  scope: SkillScope.PLATFORM,
  requiredPermissions: ['ai:skills:note-cleanup'],
  inputSchema: noteCleanupInputSchema,

  async execute(input, context) {
    const { content, style } = noteCleanupInputSchema.parse(input);

    // This would be called via the AI client
    // The skill returns the cleaned content
    return {
      success: true,
      data: {
        cleanedContent: '...', // AI-generated clean version
        changes: [
          { type: 'grammar', count: 5 },
          { type: 'formatting', count: 3 },
        ],
      },
    };
  },
};
```

### Example Action: Change Case Status

```typescript
// apps/backend/src/modules/ai/actions/actions/change-status.action.ts

import { ActionDefinition } from '../action-executor.service';
import { z } from 'zod';

export const changeStatusInputSchema = z.object({
  entityType: z.enum(['case', 'investigation']),
  entityId: z.string().uuid(),
  newStatus: z.string(),
  reason: z.string().optional(),
});

export const changeStatusAction: ActionDefinition = {
  id: 'change-status',
  name: 'Change Status',
  description: 'Change the status of a case or investigation',
  requiredPermissions: ['cases:update:status'],
  requiresPreview: false, // Quick action with undo
  undoWindowSeconds: 300, // 5 minutes

  async generatePreview(input, context) {
    const validated = changeStatusInputSchema.parse(input);

    // Fetch current status
    const entity = await context.prisma[validated.entityType].findUnique({
      where: { id: validated.entityId },
      select: { status: true },
    });

    return {
      description: `Change ${validated.entityType} status from "${entity.status}" to "${validated.newStatus}"`,
      changes: [
        {
          field: 'status',
          oldValue: entity.status,
          newValue: validated.newStatus,
        },
      ],
    };
  },

  async execute(input, context) {
    const validated = changeStatusInputSchema.parse(input);

    const previousStatus = await context.prisma[validated.entityType].findUnique({
      where: { id: validated.entityId },
      select: { status: true },
    });

    await context.prisma[validated.entityType].update({
      where: { id: validated.entityId },
      data: { status: validated.newStatus },
    });

    return {
      success: true,
      previousValue: previousStatus.status,
      newValue: validated.newStatus,
    };
  },

  async undo(actionId, context) {
    const action = await context.prisma.aiAction.findUnique({
      where: { id: actionId },
    });

    const result = action.result as { previousValue: string };
    const input = action.input as { entityType: string; entityId: string };

    await context.prisma[input.entityType].update({
      where: { id: input.entityId },
      data: { status: result.previousValue },
    });
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LangChain for everything | Direct SDK + thin abstraction | 2025 | Less overhead, better performance, simpler debugging |
| Non-streaming responses | Streaming by default | 2024 | Better UX, perceived speed |
| Global prompts | Prompt caching with cache_control | 2024-2025 | 90% cost reduction for repeated context |
| Manual tool parsing | SDK tool helpers | 2025 | Type-safe tool handling |
| REST-only AI calls | WebSocket streaming | 2025 | Real-time chat experience |
| Per-request context | Conversation persistence | 2025 | Context across sessions |

**Deprecated/outdated:**
- `completion` API: Replaced by `messages` API. Never use completions.
- Manual SSE parsing: Use SDK's `.stream()` method.
- Claude 2.x models: Use Claude 3.5+ for tool use and complex reasoning.

## Open Questions

1. **Extended Thinking for Complex Operations**
   - What we know: Claude supports extended thinking for complex reasoning tasks
   - What's unclear: When to enable it (adds latency/cost), how to stream thinking blocks
   - Recommendation: Enable for risk scoring and complex analysis; disable for simple cleanup/summary

2. **Context File Format Standard**
   - What we know: User wants CLAUDE.md-like context files at org and user levels
   - What's unclear: Exact format, validation rules, size limits
   - Recommendation: Use markdown format with YAML frontmatter for metadata; validate on save

3. **Multi-Agent Coordination**
   - What we know: Different agents (Investigation, Case, Compliance Manager) with different scopes
   - What's unclear: How agents hand off, shared vs separate conversation history
   - Recommendation: Each agent is independent; user explicitly switches; no automatic handoff in v1

4. **Legal Hold Impact on AI Actions**
   - What we know: Some entities may be under legal hold (append-only)
   - What's unclear: Which AI actions should be blocked vs modified for legal hold
   - Recommendation: Block all mutating actions on legal hold entities; allow read-only skills

## Sources

### Primary (HIGH confidence)
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) - SDK patterns, streaming, tools
- [Anthropic API Documentation](https://platform.claude.com/docs) - Messages API, streaming, tool use, prompt caching
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) - Cache control patterns, pricing

### Secondary (MEDIUM confidence)
- [Multi-Provider LLM Orchestration 2026](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10) - Provider abstraction patterns
- [Rate Limiting in Multi-Tenant APIs](https://blog.dreamfactory.com/rate-limiting-in-multi-tenant-apis-key-strategies) - Tenant isolation patterns
- [AI Gateway Rate Limiting](https://www.truefoundry.com/blog/rate-limiting-in-llm-gateway) - Token-based limiting patterns

### Tertiary (LOW confidence - validate during implementation)
- Agent architecture patterns based on Claude Code design (internal knowledge)
- Undo trail patterns based on general software engineering patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK documentation verified
- Architecture: HIGH - Based on official patterns + existing codebase patterns
- Pitfalls: MEDIUM - Based on community experience and general LLM integration patterns

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - API is stable but features evolving)

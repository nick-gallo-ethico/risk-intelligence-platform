import { Logger } from "@nestjs/common";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { ActionCatalog } from "../actions/action.catalog";
import { ActionExecutorService } from "../actions/action-executor.service";
import { AIContext } from "../dto/context.dto";
import {
  SkillDefinition,
  SkillContext,
  zodToJsonSchema,
} from "../skills/skill.types";
import { AIStreamEvent, AITool } from "../interfaces/ai-provider.interface";

/**
 * Configuration for an agent type.
 * Defines the agent's capabilities, skills, and requirements.
 */
export interface AgentConfig {
  /** Unique agent identifier (e.g., 'investigation', 'case') */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Description of agent capabilities */
  description: string;
  /** Entity types this agent handles */
  entityTypes: string[];
  /** Role required to use this agent (optional) */
  requiredRole?: string;
  /** Skill IDs available by default for this agent */
  defaultSkills: string[];
  /** Prompt template name for building system prompt */
  systemPromptTemplate: string;
}

/**
 * Context for agent operations.
 * Contains tenant isolation fields, user info, and entity context.
 */
export interface AgentContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityType?: string;
  entityId?: string;
  teamId?: string;
}

/**
 * Message format for agent conversations.
 */
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * BaseAgent is the abstract base class for all scoped agents.
 *
 * Agents are context-aware AI assistants specialized for different entity types
 * (Investigation, Case) and roles (Compliance Manager). Each agent has access
 * to appropriate skills based on its scope.
 *
 * Key features:
 * - Context hierarchy loading (platform -> org -> team -> user -> entity)
 * - Conversation management with persistence
 * - Skill access filtered by agent type and permissions
 * - Rate limiting integration
 * - Streaming chat responses
 *
 * Usage:
 * ```typescript
 * const agent = agentRegistry.getAgent('investigation', context);
 * await agent.initialize(context);
 *
 * // Stream chat response
 * for await (const event of agent.chat('Summarize this investigation', context)) {
 *   if (event.type === 'text_delta') {
 *     console.log(event.text);
 *   }
 * }
 * ```
 */
export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected aiContext: AIContext | null = null;
  protected conversationId: string | null = null;

  constructor(
    protected readonly config: AgentConfig,
    protected readonly providerRegistry: ProviderRegistryService,
    protected readonly contextLoader: ContextLoaderService,
    protected readonly conversationService: ConversationService,
    protected readonly skillRegistry: SkillRegistry,
    protected readonly rateLimiter: AiRateLimiterService,
    protected readonly actionCatalog?: ActionCatalog,
    protected readonly actionExecutor?: ActionExecutorService,
  ) {
    this.logger = new Logger(config.name);
  }

  /** Agent identifier */
  get id(): string {
    return this.config.id;
  }

  /** Agent display name */
  get name(): string {
    return this.config.name;
  }

  /** Entity types this agent handles */
  get entityTypes(): string[] {
    return this.config.entityTypes;
  }

  /** Agent description */
  get description(): string {
    return this.config.description;
  }

  /**
   * Initialize the agent with context.
   * Loads AI context hierarchy and gets/creates conversation.
   *
   * @param context - Agent context with tenant and user info
   */
  async initialize(context: AgentContext): Promise<void> {
    // Load AI context from hierarchy
    this.aiContext = await this.contextLoader.loadContext({
      organizationId: context.organizationId,
      userId: context.userId,
      teamId: context.teamId,
      entityType: context.entityType,
      entityId: context.entityId,
    });

    // Get or create conversation for this context
    const conversation = await this.conversationService.getOrCreate({
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: context.entityType,
      entityId: context.entityId,
      agentType: this.config.id,
    });

    this.conversationId = conversation.id;

    this.logger.debug(
      `Initialized ${this.name} for ${context.entityType}:${context.entityId}`,
    );
  }

  /**
   * Get available skills for this agent in the current context.
   * Filters to skills appropriate for this agent type.
   *
   * @param context - Agent context with permissions
   * @returns Array of available skill definitions
   */
  getAvailableSkills(context: AgentContext): SkillDefinition[] {
    const allSkills = this.skillRegistry.getAvailableSkills({
      organizationId: context.organizationId,
      userId: context.userId,
      teamId: context.teamId,
      entityType: context.entityType,
      userPermissions: context.permissions,
    });

    // Filter to skills appropriate for this agent
    return allSkills.filter(
      (skill) =>
        this.config.defaultSkills.includes(skill.id) ||
        this.getAdditionalSkills().includes(skill.id),
    );
  }

  /**
   * Get all tools (skills + actions) available for this agent.
   * Actions are prefixed with 'action:' to distinguish from skills.
   *
   * @param context - Agent context with permissions
   * @returns Array of AITool definitions
   */
  protected getAllTools(context: AgentContext): AITool[] {
    const tools: AITool[] = [];

    // Add skills as tools
    const skills = this.getAvailableSkills(context);
    tools.push(...this.skillRegistry.toClaudeTools(skills));

    // Add actions as tools (if actionCatalog available)
    if (this.actionCatalog && context.entityType) {
      const actions = this.actionCatalog.getAvailableActions({
        entityType: context.entityType,
        userPermissions: context.permissions,
      });

      for (const action of actions) {
        tools.push({
          name: `action_${action.id}`,
          description: `[ACTION] ${action.description}. This will modify the ${context.entityType}.`,
          inputSchema: zodToJsonSchema(action.inputSchema),
        });
      }
    }

    return tools;
  }

  /**
   * Execute a tool call (skill or action).
   *
   * @param toolName - Name of the tool (or action:id for actions)
   * @param input - Tool input
   * @param context - Agent context
   * @returns Tool result
   */
  protected async executeToolCall(
    toolName: string,
    input: unknown,
    context: AgentContext,
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    // Check if it's an action (prefixed with "action:")
    if (toolName.startsWith("action_")) {
      const actionId = toolName.replace("action_", "");
      return this.executeAction(actionId, input, context);
    }

    // Otherwise it's a skill
    return this.executeSkill(toolName, input, context);
  }

  /**
   * Execute a skill by ID.
   */
  private async executeSkill(
    skillId: string,
    input: unknown,
    context: AgentContext,
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const skillContext: SkillContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: context.entityType,
      entityId: context.entityId,
      permissions: context.permissions,
    };

    const result = await this.skillRegistry.executeSkill(
      skillId,
      input,
      skillContext,
    );

    return {
      success: result.success,
      result: result.data,
      error: result.error,
    };
  }

  /**
   * Execute an action by ID.
   */
  private async executeAction(
    actionId: string,
    input: unknown,
    context: AgentContext,
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (!this.actionExecutor || !context.entityType || !context.entityId) {
      return {
        success: false,
        error: "Action execution not available in this context",
      };
    }

    try {
      this.logger.debug(
        `Executing action ${actionId} with input: ${JSON.stringify(input)} for ${context.entityType}:${context.entityId}`,
      );

      const result = await this.actionExecutor.execute(
        actionId,
        input,
        {
          organizationId: context.organizationId,
          userId: context.userId,
          userRole: context.userRole,
          permissions: context.permissions,
          entityType: context.entityType,
          entityId: context.entityId,
          conversationId: this.conversationId || undefined,
        },
        true, // skipPreview for AI-initiated actions
      );

      this.logger.debug(
        `Action ${actionId} result: success=${result.success}, error=${result.error || "none"}`,
      );

      return {
        success: result.success,
        result: result.result,
        error: result.error,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Action ${actionId} threw: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message || "Action execution failed",
      };
    }
  }

  /**
   * Build system prompt for this agent.
   * Combines context hierarchy with agent-specific instructions.
   *
   * @param context - Agent context
   * @returns System prompt string
   */
  async buildSystemPrompt(context: AgentContext): Promise<string> {
    if (!this.aiContext) {
      await this.initialize(context);
    }

    return this.contextLoader.buildSystemPrompt(
      this.aiContext!,
      this.config.systemPromptTemplate,
    );
  }

  /**
   * Chat with the agent (streaming).
   * Returns an async generator of stream events.
   *
   * @param message - User message
   * @param context - Agent context
   * @yields AIStreamEvent - Stream events (text_delta, tool_use, usage, etc.)
   */
  async *chat(
    message: string,
    context: AgentContext,
  ): AsyncGenerator<AIStreamEvent> {
    if (!this.aiContext || !this.conversationId) {
      await this.initialize(context);
    }

    // Estimate tokens for rate limiting
    const estimatedTokens = Math.ceil(message.length / 4) + 500;

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId: context.organizationId,
      estimatedTokens,
    });

    if (!rateLimitResult.allowed) {
      yield {
        type: "error",
        error: `Rate limit exceeded. Please wait ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)} seconds.`,
      };
      return;
    }

    // Save user message to conversation
    await this.conversationService.addMessage({
      conversationId: this.conversationId!,
      role: "user",
      content: message,
    });

    // Get conversation history for context
    const history = await this.conversationService.getMessages(
      this.conversationId!,
      20,
    );

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(context);

    // Get all available tools (skills + actions)
    const tools = this.getAllTools(context);

    // Get AI provider
    const provider = this.providerRegistry.getDefaultProvider();

    let fullContent = "";
    const startTime = Date.now();

    try {
      // Stream from AI provider
      const stream = provider.streamMessage({
        system: systemPrompt,
        messages: [
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: message },
        ],
        tools: tools.length > 0 ? tools : undefined,
      });

      for await (const event of stream) {
        if (event.type === "text_delta" && event.text) {
          fullContent += event.text;
          yield event;
        } else if (event.type === "tool_use" && event.toolCall) {
          yield event;

          // Execute tool (skill or action)
          const result = await this.executeToolCall(
            event.toolCall.name,
            event.toolCall.input,
            context,
          );

          // Log tool execution result
          this.logger.debug(
            `Tool ${event.toolCall.name} result: ${result.success}`,
          );

          // If this was an action (not a skill), emit action_executed event
          if (event.toolCall.name.startsWith("action_")) {
            const actionId = event.toolCall.name.replace("action_", "");
            yield {
              type: "action_executed",
              actionResult: {
                action: actionId,
                success: result.success,
                message: result.success
                  ? "Completed successfully"
                  : result.error,
                result: result.result,
              },
            };
          }

          // Yield the tool result for the UI to display
          if (result.success) {
            yield {
              type: "text_delta",
              text: `\n\n✓ ${event.toolCall.name.replace("action_", "")}: ${
                typeof result.result === "object"
                  ? JSON.stringify(result.result)
                  : result.result || "Completed successfully"
              }\n\n`,
            };
          } else {
            yield {
              type: "text_delta",
              text: `\n\n✗ ${event.toolCall.name.replace("action_", "")} failed: ${result.error}\n\n`,
            };
          }

          // Note: In a full implementation, we would continue the conversation
          // with the tool result. For now, we just log and continue.
        } else if (event.type === "usage" && event.usage) {
          // Record actual usage
          await this.rateLimiter.recordUsage({
            organizationId: context.organizationId,
            userId: context.userId,
            inputTokens: event.usage.inputTokens,
            outputTokens: event.usage.outputTokens,
            model: provider.defaultModel,
            featureType: `agent:${this.config.id}`,
            entityType: context.entityType,
            entityId: context.entityId,
            durationMs: Date.now() - startTime,
          });
        } else {
          yield event;
        }
      }

      // Save assistant message to conversation
      if (fullContent) {
        await this.conversationService.addMessage({
          conversationId: this.conversationId!,
          role: "assistant",
          content: fullContent,
        });
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Chat error: ${err.message}`);
      yield { type: "error", error: err.message };
    }
  }

  /**
   * Get suggested prompts for this agent in the current context.
   * Each agent type provides context-aware suggestions.
   *
   * @param context - Agent context
   * @returns Array of suggested prompt strings
   */
  abstract getSuggestedPrompts(context: AgentContext): string[];

  /**
   * Get additional skills specific to this agent type.
   * Override in subclasses to add agent-specific skills.
   *
   * @returns Array of additional skill IDs
   */
  protected abstract getAdditionalSkills(): string[];

  /**
   * Reset the agent state.
   * Clears cached context and conversation.
   */
  reset(): void {
    this.aiContext = null;
    this.conversationId = null;
  }
}

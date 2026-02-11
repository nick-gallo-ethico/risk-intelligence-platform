import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Injectable,
  ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { SkillRegistry } from "./skills/skill.registry";
import { ActionCatalog } from "./actions/action.catalog";
import { ActionExecutorService } from "./actions/action-executor.service";
import { ConversationService } from "./services/conversation.service";
import { ContextLoaderService } from "./services/context-loader.service";
import { AgentRegistry } from "./agents/agent.registry";
import { AiRateLimiterService } from "./services/rate-limiter.service";
import { AiClientService } from "./services/ai-client.service";
import { ConversationStatus } from "./dto/conversation.dto";

/**
 * Request type with user context.
 * In production, populated by JwtAuthGuard.
 */
interface AuthenticatedRequest {
  user?: {
    id: string;
    organizationId: string;
    role: string;
    permissions: string[];
  };
}

/**
 * OptionalJwtAuthGuard extends AuthGuard('jwt') but doesn't throw on missing auth.
 * This allows endpoints to work with or without authentication:
 * - Authenticated users get real `req.user` with organizationId, id, role, permissions
 * - Unauthenticated users get `req.user = null` and fallbacks still work
 */
@Injectable()
class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Always try to validate the token, but don't fail if missing
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser | null {
    // Don't throw on missing auth — return null user
    // This allows the controller to use fallback "demo" values
    return user || null;
  }
}

/**
 * AiController provides REST endpoints for AI features.
 *
 * Endpoints are organized by feature:
 * - Chat: REST endpoint for agent-based chat (non-streaming)
 * - Skills: List and execute AI skills
 * - Actions: List, preview, execute, and undo actions
 * - Conversations: CRUD and search for AI conversations
 * - Agents: List agents and get suggestions
 * - Usage: Get AI usage statistics
 *
 * All endpoints use OptionalJwtAuthGuard - works with or without auth.
 * Authenticated users get real context; unauthenticated users get "demo" fallbacks.
 * Tenant isolation enforced via organizationId from JWT when available.
 *
 * @see AiGateway for WebSocket streaming endpoints
 */
@Controller("ai")
@UseGuards(OptionalJwtAuthGuard)
export class AiController {
  constructor(
    private readonly skillRegistry: SkillRegistry,
    private readonly actionCatalog: ActionCatalog,
    private readonly actionExecutor: ActionExecutorService,
    private readonly conversationService: ConversationService,
    private readonly contextLoader: ContextLoaderService,
    private readonly agentRegistry: AgentRegistry,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly aiClientService: AiClientService,
  ) {}

  // ============ Health ============

  /**
   * Health check endpoint for AI service status.
   * Reports whether AI is configured, available capabilities, and model info.
   * Used by frontend for graceful degradation when AI is unavailable.
   */
  @Get("health")
  async getHealth() {
    const isConfigured = this.aiClientService.isConfigured();
    const skills = this.skillRegistry.listSkills();
    const agents = this.agentRegistry.listAgentTypes();
    const actions = this.actionCatalog.listActions();

    return {
      status: isConfigured ? "available" : "unavailable",
      configured: isConfigured,
      capabilities: {
        chat: isConfigured,
        skills: skills,
        agents: agents,
        actions: actions,
      },
      model: isConfigured ? this.aiClientService.getModel() : null,
    };
  }

  // ============ Chat ============

  /**
   * Chat with an AI agent via REST (non-streaming).
   * Routes through the agent system, collecting streamed response into single response.
   *
   * Use WebSocket endpoints in AiGateway for streaming responses.
   *
   * @param body - Chat request with message, optional entity context, and agent type
   * @param req - Request with optional user context from JWT
   * @returns Chat response with agent reply
   */
  @Post("chat")
  async chat(
    @Body()
    body: {
      message: string;
      entityType?: string;
      entityId?: string;
      agentType?: string;
      conversationId?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = req.user?.organizationId || "demo";
    const userId = req.user?.id || "demo";
    const userRole = req.user?.role || "EMPLOYEE";
    const permissions = req.user?.permissions || [];

    // Determine agent type from explicit param, entity type, or default
    const resolvedAgentType =
      body.agentType ||
      this.agentRegistry.getAgentTypeForEntity(body.entityType || "") ||
      "compliance-manager";

    const context = {
      organizationId: orgId,
      userId: userId,
      userRole: userRole,
      permissions: permissions,
      entityType: body.entityType,
      entityId: body.entityId,
    };

    try {
      // Get or create agent
      const agent = this.agentRegistry.getAgent(resolvedAgentType, context);
      await agent.initialize(context);

      // Collect streamed response into single response (non-streaming REST)
      let fullContent = "";

      for await (const event of agent.chat(body.message, context)) {
        if (event.type === "text_delta" && event.text) {
          fullContent += event.text;
        } else if (event.type === "error") {
          return {
            success: false,
            error: event.error || "AI processing failed",
            agentType: resolvedAgentType,
          };
        }
      }

      return {
        success: true,
        response: fullContent,
        agentType: resolvedAgentType,
        entityType: body.entityType,
        entityId: body.entityId,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message || "Failed to process chat request",
        agentType: resolvedAgentType,
      };
    }
  }

  // ============ Skills ============

  /**
   * List available skills for the authenticated user.
   * Filtered by user permissions and entity type.
   */
  @Get("skills")
  async listSkills(@Request() req: AuthenticatedRequest) {
    const orgId = req.user?.organizationId || "demo";
    const userId = req.user?.id || "demo";
    const permissions = req.user?.permissions || [];

    const skills = this.skillRegistry.getAvailableSkills({
      organizationId: orgId,
      userId: userId,
      userPermissions: permissions,
    });

    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      scope: s.scope,
    }));
  }

  /**
   * Execute a skill by ID.
   * Returns skill result with success/failure status.
   */
  @Post("skills/:skillId/execute")
  async executeSkill(
    @Param("skillId") skillId: string,
    @Body()
    body: {
      input: Record<string, unknown>;
      entityType?: string;
      entityId?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.skillRegistry.executeSkill(skillId, body.input, {
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      entityType: body.entityType,
      entityId: body.entityId,
      permissions: req.user?.permissions || [],
    });

    return result;
  }

  // ============ Actions ============

  /**
   * List available actions for an entity type.
   * Filtered by user permissions.
   */
  @Get("actions")
  async listActions(
    @Query("entityType") entityType: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const actions = this.actionCatalog.getAvailableActions({
      entityType,
      userPermissions: req.user?.permissions || [],
    });

    return actions.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      requiresPreview: this.actionCatalog.requiresPreview(a.id),
      undoable: this.actionCatalog.isUndoable(a.id),
      undoWindowSeconds: this.actionCatalog.getUndoWindow(a.id),
    }));
  }

  /**
   * Preview an action before execution.
   * Shows what changes will be made.
   */
  @Post("actions/:actionId/preview")
  async previewAction(
    @Param("actionId") actionId: string,
    @Body()
    body: {
      input: Record<string, unknown>;
      entityType: string;
      entityId: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const preview = await this.actionExecutor.preview(actionId, body.input, {
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      userRole: req.user?.role || "EMPLOYEE",
      permissions: req.user?.permissions || [],
      entityType: body.entityType,
      entityId: body.entityId,
    });

    return preview;
  }

  /**
   * Execute an action.
   * Returns action result with undo capability info.
   */
  @Post("actions/:actionId/execute")
  async executeAction(
    @Param("actionId") actionId: string,
    @Body()
    body: {
      input: Record<string, unknown>;
      entityType: string;
      entityId: string;
      skipPreview?: boolean;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.actionExecutor.execute(
      actionId,
      body.input,
      {
        organizationId: req.user?.organizationId || "demo",
        userId: req.user?.id || "demo",
        userRole: req.user?.role || "EMPLOYEE",
        permissions: req.user?.permissions || [],
        entityType: body.entityType,
        entityId: body.entityId,
      },
      body.skipPreview,
    );

    return result;
  }

  /**
   * Undo a previously executed action.
   * Must be within action's undo window.
   */
  @Post("actions/:actionId/undo")
  async undoAction(
    @Param("actionId") actionId: string,
    @Body() body: { entityType: string; entityId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    await this.actionExecutor.undo(actionId, {
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      userRole: req.user?.role || "EMPLOYEE",
      permissions: req.user?.permissions || [],
      entityType: body.entityType,
      entityId: body.entityId,
    });

    return { success: true };
  }

  /**
   * Check if an action can be undone.
   * Returns remaining time in undo window.
   */
  @Get("actions/:actionId/can-undo")
  async canUndoAction(
    @Param("actionId") actionId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.actionExecutor.canUndo(actionId, {
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      userRole: req.user?.role || "EMPLOYEE",
      permissions: req.user?.permissions || [],
      entityType,
      entityId,
    });
  }

  // ============ Conversations ============

  /**
   * List conversations for the authenticated user.
   * Supports filtering by status, entity type, and entity ID.
   */
  @Get("conversations")
  async listConversations(
    @Query("status") status: ConversationStatus,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Query("limit") limit: string,
    @Query("offset") offset: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.conversationService.list({
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      status,
      entityType,
      entityId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Search conversations by message content.
   */
  @Get("conversations/search")
  async searchConversations(
    @Query("q") query: string,
    @Query("limit") limit: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.conversationService.search({
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      query,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get a specific conversation with messages.
   */
  @Get("conversations/:id")
  async getConversation(
    @Param("id") id: string,
    @Query("messageLimit") messageLimit: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.conversationService.getWithMessages(
      id,
      req.user?.organizationId || "demo",
      messageLimit ? parseInt(messageLimit, 10) : undefined,
    );
  }

  /**
   * Archive a conversation (soft delete).
   */
  @Post("conversations/:id/archive")
  async archiveConversation(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.conversationService.archive(
      id,
      req.user?.organizationId || "demo",
    );
    return { success: true };
  }

  /**
   * Get conversation statistics for the authenticated user.
   */
  @Get("conversations/stats")
  async getConversationStats(@Request() req: AuthenticatedRequest) {
    return this.conversationService.getStats(
      req.user?.organizationId || "demo",
      req.user?.id || "demo",
    );
  }

  // ============ Agents ============

  /**
   * List available agent types.
   */
  @Get("agents")
  async listAgents() {
    const agentTypes = this.agentRegistry.listAgentTypes();
    return agentTypes.map((type) => {
      const metadata = this.agentRegistry.getAgentMetadata(type);
      return metadata || { id: type };
    });
  }

  /**
   * Get suggested prompts for an agent type.
   * Prompts are context-aware based on entity.
   */
  @Get("agents/:type/suggestions")
  async getAgentSuggestions(
    @Param("type") type: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const agent = this.agentRegistry.getAgent(type, {
      organizationId: req.user?.organizationId || "demo",
      userId: req.user?.id || "demo",
      userRole: req.user?.role || "EMPLOYEE",
      permissions: req.user?.permissions || [],
      entityType,
      entityId,
    });

    return {
      suggestions: agent.getSuggestedPrompts({
        organizationId: req.user?.organizationId || "demo",
        userId: req.user?.id || "demo",
        userRole: req.user?.role || "EMPLOYEE",
        permissions: req.user?.permissions || [],
        entityType,
        entityId,
      }),
    };
  }

  // ============ Usage ============

  /**
   * Get AI usage statistics for the organization.
   * Supports day, week, and month periods.
   */
  @Get("usage")
  async getUsage(
    @Query("period") period: "day" | "week" | "month",
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rateLimiter.getUsageStats(
      req.user?.organizationId || "demo",
      period || "day",
    );
  }

  /**
   * Get current rate limit status.
   * Shows remaining capacity for API calls.
   */
  @Get("rate-limit-status")
  async getRateLimitStatus(@Request() req: AuthenticatedRequest) {
    return this.rateLimiter.getRateLimitStatus(
      req.user?.organizationId || "demo",
    );
  }

  // ============ Context ============

  /**
   * Get current AI context for debugging.
   * Shows assembled context from hierarchy.
   */
  @Get("context")
  async getContext(
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const context = await this.contextLoader.loadContext({
        organizationId: req.user?.organizationId || "demo",
        userId: req.user?.id || "demo",
        entityType,
        entityId,
      });

      return context;
    } catch (error) {
      // Return partial context on error instead of 500
      return {
        error: error.message || "Failed to load context",
        platform: { name: "Ethico Risk Intelligence Platform" },
        organization: null,
        user: null,
        entity: null,
      };
    }
  }
}

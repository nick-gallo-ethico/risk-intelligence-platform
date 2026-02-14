/**
 * AiController - REST endpoints for AI features
 *
 * Thin controller layer that delegates business logic to services:
 * - AiOrchestrationService: Chat processing and context management
 * - SkillRegistry: Skill discovery and execution
 * - ActionCatalog: Action discovery
 * - ActionExecutorService: Action execution and undo
 * - ConversationService: Conversation management
 *
 * All endpoints use OptionalJwtAuthGuard - works with or without auth.
 * Authenticated users get real context; unauthenticated users get "demo" fallbacks.
 */

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
import {
  AiOrchestrationService,
  UserContext,
} from "./services/ai-orchestration.service";
import { ConversationStatus } from "./dto/conversation.dto";

interface AuthenticatedRequest {
  user?: {
    id: string;
    organizationId: string;
    role: string;
    permissions: string[];
  };
}

@Injectable()
class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser | null {
    return user || null;
  }
}

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
    private readonly orchestrationService: AiOrchestrationService,
  ) {}

  // Health
  @Get("health")
  async getHealth() {
    const isConfigured = this.aiClientService.isConfigured();
    return {
      status: isConfigured ? "available" : "unavailable",
      configured: isConfigured,
      capabilities: {
        chat: isConfigured,
        skills: this.skillRegistry.listSkills(),
        agents: this.agentRegistry.listAgentTypes(),
        actions: this.actionCatalog.listActions(),
      },
      model: isConfigured ? this.aiClientService.getModel() : null,
    };
  }

  // Chat
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
    const userContext = this.orchestrationService.extractUserContext(req.user);
    return this.orchestrationService.processChat(body, userContext);
  }

  // Skills
  @Get("skills")
  async listSkills(@Request() req: AuthenticatedRequest) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    const skills = this.skillRegistry.getAvailableSkills({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      userPermissions: ctx.permissions,
    });
    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      scope: s.scope,
    }));
  }

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
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.skillRegistry.executeSkill(skillId, body.input, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: body.entityType,
      entityId: body.entityId,
      permissions: ctx.permissions,
    });
  }

  // Actions
  @Get("actions")
  async listActions(
    @Query("entityType") entityType: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    const actions = this.actionCatalog.getAvailableActions({
      entityType,
      userPermissions: ctx.permissions,
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
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.actionExecutor.preview(
      actionId,
      body.input,
      this.orchestrationService.buildActionContext(ctx, body),
    );
  }

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
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.actionExecutor.execute(
      actionId,
      body.input,
      this.orchestrationService.buildActionContext(ctx, body),
      body.skipPreview,
    );
  }

  @Post("actions/:actionId/undo")
  async undoAction(
    @Param("actionId") actionId: string,
    @Body() body: { entityType: string; entityId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    await this.actionExecutor.undo(
      actionId,
      this.orchestrationService.buildActionContext(ctx, body),
    );
    return { success: true };
  }

  @Get("actions/:actionId/can-undo")
  async canUndoAction(
    @Param("actionId") actionId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.actionExecutor.canUndo(
      actionId,
      this.orchestrationService.buildActionContext(ctx, {
        entityType,
        entityId,
      }),
    );
  }

  // Conversations
  @Get("conversations")
  async listConversations(
    @Query("status") status: ConversationStatus,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Query("limit") limit: string,
    @Query("offset") offset: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.conversationService.list({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      status,
      entityType,
      entityId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get("conversations/search")
  async searchConversations(
    @Query("q") query: string,
    @Query("limit") limit: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.conversationService.search({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      query,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("conversations/:id")
  async getConversation(
    @Param("id") id: string,
    @Query("messageLimit") messageLimit: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.conversationService.getWithMessages(
      id,
      ctx.organizationId,
      messageLimit ? parseInt(messageLimit, 10) : undefined,
    );
  }

  @Post("conversations/:id/archive")
  async archiveConversation(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    await this.conversationService.archive(id, ctx.organizationId);
    return { success: true };
  }

  @Get("conversations/stats")
  async getConversationStats(@Request() req: AuthenticatedRequest) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.conversationService.getStats(ctx.organizationId, ctx.userId);
  }

  // Agents
  @Get("agents")
  async listAgents() {
    return this.agentRegistry
      .listAgentTypes()
      .map((type) => this.agentRegistry.getAgentMetadata(type) || { id: type });
  }

  @Get("agents/:type/suggestions")
  async getAgentSuggestions(
    @Param("type") type: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    const agentCtx = this.orchestrationService.buildAgentContext(ctx, {
      entityType,
      entityId,
    });
    const agent = this.agentRegistry.getAgent(type, agentCtx);
    return { suggestions: agent.getSuggestedPrompts(agentCtx) };
  }

  // Usage
  @Get("usage")
  async getUsage(
    @Query("period") period: "day" | "week" | "month",
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.rateLimiter.getUsageStats(ctx.organizationId, period || "day");
  }

  @Get("rate-limit-status")
  async getRateLimitStatus(@Request() req: AuthenticatedRequest) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    return this.rateLimiter.getRateLimitStatus(ctx.organizationId);
  }

  // Context
  @Get("context")
  async getContext(
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ctx = this.orchestrationService.extractUserContext(req.user);
    try {
      return await this.contextLoader.loadContext({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        entityType,
        entityId,
      });
    } catch (error: unknown) {
      return {
        error: (error as Error).message || "Failed to load context",
        platform: { name: "Ethico Risk Intelligence Platform" },
        organization: null,
        user: null,
        entity: null,
      };
    }
  }
}

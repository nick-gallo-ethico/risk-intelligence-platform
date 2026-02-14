/**
 * AiOrchestrationService - Orchestrates AI chat and context operations
 *
 * Handles:
 * - Context building from user request
 * - Agent type resolution
 * - Chat message processing with streaming collection
 * - Error handling for AI operations
 *
 * Extracted from AiController to maintain thin controller pattern.
 */

import { Injectable, Logger } from "@nestjs/common";
import { AgentRegistry } from "../agents/agent.registry";

/**
 * User context from request
 */
export interface UserContext {
  organizationId: string;
  userId: string;
  role: string;
  permissions: string[];
}

/**
 * Chat request input
 */
export interface ChatInput {
  message: string;
  entityType?: string;
  entityId?: string;
  agentType?: string;
  conversationId?: string;
}

/**
 * Chat response
 */
export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  agentType: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Agent context for initialization and chat (entityType/entityId optional)
 */
export interface AgentContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityType?: string;
  entityId?: string;
}

/**
 * Action context (entityType/entityId required)
 */
export interface ActionContextStrict {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityType: string;
  entityId: string;
}

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(private readonly agentRegistry: AgentRegistry) {}

  /**
   * Process a chat message through an AI agent.
   * Collects streamed response into a single response (non-streaming REST).
   *
   * @param input - Chat input with message and context
   * @param userContext - User context from JWT
   * @returns Chat response with agent reply
   */
  async processChat(
    input: ChatInput,
    userContext: UserContext,
  ): Promise<ChatResponse> {
    // Resolve agent type from explicit param, entity type, or default
    const agentType = this.resolveAgentType(input.agentType, input.entityType);

    // Build agent context
    const context = this.buildAgentContext(userContext, input);

    try {
      // Get or create agent
      const agent = this.agentRegistry.getAgent(agentType, context);
      await agent.initialize(context);

      // Collect streamed response into single response
      let fullContent = "";

      for await (const event of agent.chat(input.message, context)) {
        if (event.type === "text_delta" && event.text) {
          fullContent += event.text;
        } else if (event.type === "error") {
          return {
            success: false,
            error: event.error || "AI processing failed",
            agentType,
          };
        }
      }

      return {
        success: true,
        response: fullContent,
        agentType,
        entityType: input.entityType,
        entityId: input.entityId,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Chat processing failed: ${err.message}`, err.stack);

      return {
        success: false,
        error: err.message || "Failed to process chat request",
        agentType,
      };
    }
  }

  /**
   * Build agent context from user context and input.
   */
  buildAgentContext(
    userContext: UserContext,
    input?: { entityType?: string; entityId?: string },
  ): AgentContext {
    return {
      organizationId: userContext.organizationId,
      userId: userContext.userId,
      userRole: userContext.role,
      permissions: userContext.permissions,
      entityType: input?.entityType,
      entityId: input?.entityId,
    };
  }

  /**
   * Build action context from user context and input.
   * Requires entityType and entityId.
   */
  buildActionContext(
    userContext: UserContext,
    input: { entityType: string; entityId: string },
  ): ActionContextStrict {
    return {
      organizationId: userContext.organizationId,
      userId: userContext.userId,
      userRole: userContext.role,
      permissions: userContext.permissions,
      entityType: input.entityType,
      entityId: input.entityId,
    };
  }

  /**
   * Resolve the agent type to use for a request.
   *
   * Priority:
   * 1. Explicit agentType parameter
   * 2. Entity type mapping
   * 3. Default: compliance-manager
   */
  private resolveAgentType(explicitType?: string, entityType?: string): string {
    if (explicitType) {
      return explicitType;
    }

    if (entityType) {
      const mappedType = this.agentRegistry.getAgentTypeForEntity(entityType);
      if (mappedType) {
        return mappedType;
      }
    }

    return "compliance-manager";
  }

  /**
   * Extract user context from request with demo fallbacks.
   *
   * @param requestUser - User from JWT (may be null for unauthenticated)
   * @returns User context with demo fallbacks if needed
   */
  extractUserContext(
    requestUser?: {
      id?: string;
      organizationId?: string;
      role?: string;
      permissions?: string[];
    } | null,
  ): UserContext {
    return {
      organizationId: requestUser?.organizationId || "demo",
      userId: requestUser?.id || "demo",
      role: requestUser?.role || "EMPLOYEE",
      permissions: requestUser?.permissions || [],
    };
  }
}

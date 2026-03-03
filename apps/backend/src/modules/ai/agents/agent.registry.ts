import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { ActionCatalog } from "../actions/action.catalog";
import { ActionExecutorService } from "../actions/action-executor.service";
import { BaseAgent, AgentContext } from "./base.agent";
import { InvestigationAgent } from "./investigation.agent";
import { CaseAgent } from "./case.agent";
import { ComplianceManagerAgent } from "./compliance-manager.agent";
import { EmployeeChatbotAgent } from "./employee-chatbot.agent";

/**
 * Type for agent class constructors.
 */
type AgentConstructor = new (
  providerRegistry: ProviderRegistryService,
  contextLoader: ContextLoaderService,
  conversationService: ConversationService,
  skillRegistry: SkillRegistry,
  rateLimiter: AiRateLimiterService,
  actionCatalog?: ActionCatalog,
  actionExecutor?: ActionExecutorService,
) => BaseAgent;

/** Cache configuration constants */
const AGENT_CACHE_MAX_SIZE = 1000;
const AGENT_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * AgentRegistry manages agent type registration and instance creation.
 *
 * Provides a centralized registry for all agent types (Investigation, Case,
 * Compliance Manager, etc.) and creates agent instances scoped to specific
 * contexts (organization, user, entity).
 *
 * Key features:
 * - Agent type registration at module init
 * - Context-based agent instance caching with LRU eviction
 * - Entity type to agent type mapping
 * - Agent lifecycle management
 * - Bounded memory usage (max 1000 instances, 30-minute TTL)
 *
 * Usage:
 * ```typescript
 * // Get an agent for a specific context
 * const agent = agentRegistry.getAgent('investigation', {
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   userRole: 'INVESTIGATOR',
 *   permissions: ['ai:skills:note-cleanup'],
 *   entityType: 'investigation',
 *   entityId: 'inv-789',
 * });
 *
 * // Use the agent
 * for await (const event of agent.chat('Summarize this investigation', context)) {
 *   // Handle stream events
 * }
 *
 * // Get appropriate agent for an entity
 * const agentType = agentRegistry.getAgentTypeForEntity('case');
 *
 * // Monitor cache usage
 * const stats = agentRegistry.getCacheStats();
 * ```
 */
@Injectable()
export class AgentRegistry implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistry.name);

  /** Registered agent constructors by type */
  private readonly agents = new Map<string, AgentConstructor>();

  /** Cached agent instances with LRU eviction */
  private readonly agentInstances: LRUCache<string, BaseAgent>;

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly contextLoader: ContextLoaderService,
    private readonly conversationService: ConversationService,
    private readonly skillRegistry: SkillRegistry,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly actionCatalog: ActionCatalog,
    private readonly actionExecutor: ActionExecutorService,
  ) {
    // Initialize LRU cache with size and TTL limits to prevent memory exhaustion
    this.agentInstances = new LRUCache<string, BaseAgent>({
      max: AGENT_CACHE_MAX_SIZE,
      ttl: AGENT_CACHE_TTL_MS,
      updateAgeOnGet: true, // Reset TTL on access
      allowStale: false, // Don't return stale items
      dispose: (value, key) => {
        this.logger.debug(`Evicting agent instance: ${key}`);
      },
    });
  }

  onModuleInit() {
    // Register built-in agent types
    this.registerAgentType("investigation", InvestigationAgent);
    this.registerAgentType("case", CaseAgent);
    this.registerAgentType("compliance-manager", ComplianceManagerAgent);
    this.registerAgentType("employee-chatbot", EmployeeChatbotAgent);

    this.logger.log(`Registered ${this.agents.size} agent types`);
  }

  /**
   * Register an agent type.
   * Can be used to add custom agent types at runtime.
   *
   * @param id - Agent type identifier
   * @param agentClass - Agent class constructor
   */
  registerAgentType(id: string, agentClass: AgentConstructor): void {
    if (this.agents.has(id)) {
      this.logger.warn(`Overwriting agent type: ${id}`);
    }
    this.agents.set(id, agentClass);
    this.logger.debug(`Registered agent type: ${id}`);
  }

  /**
   * Get an agent instance for the given context.
   * Creates a new instance or returns existing cached instance.
   *
   * @param agentType - Type of agent to get
   * @param context - Agent context
   * @returns Agent instance
   * @throws Error if agent type not found
   */
  getAgent(agentType: string, context: AgentContext): BaseAgent {
    const AgentClass = this.agents.get(agentType);
    if (!AgentClass) {
      throw new Error(`Agent type not found: ${agentType}`);
    }

    // Create unique key for this context
    const contextKey = this.buildContextKey(agentType, context);

    // Check for existing instance
    let agent = this.agentInstances.get(contextKey);
    if (agent) {
      return agent;
    }

    // Create new instance
    agent = new AgentClass(
      this.providerRegistry,
      this.contextLoader,
      this.conversationService,
      this.skillRegistry,
      this.rateLimiter,
      this.actionCatalog,
      this.actionExecutor,
    );

    this.agentInstances.set(contextKey, agent);
    this.logger.debug(`Created agent instance: ${contextKey}`);

    return agent;
  }

  /**
   * Try to get an agent instance without throwing.
   * Returns null if agent type not found.
   *
   * @param agentType - Type of agent to get
   * @param context - Agent context
   * @returns Agent instance or null
   */
  tryGetAgent(agentType: string, context: AgentContext): BaseAgent | null {
    try {
      return this.getAgent(agentType, context);
    } catch {
      return null;
    }
  }

  /**
   * Get the appropriate agent type for an entity type.
   * Maps entity types to their specialized agents.
   *
   * @param entityType - Type of entity
   * @returns Agent type ID or 'compliance-manager' as default
   */
  getAgentTypeForEntity(entityType: string): string {
    switch (entityType) {
      case "investigation":
        return "investigation";
      case "case":
        return "case";
      case "chatbot":
        return "employee-chatbot";
      case "campaign":
      case "policy":
      case "report":
        return "compliance-manager";
      default:
        return "compliance-manager"; // Default to org-wide agent
    }
  }

  /**
   * List available agent types.
   *
   * @returns Array of agent type IDs
   */
  listAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent type metadata.
   * Creates a temporary instance to read config.
   *
   * @param agentType - Agent type ID
   * @returns Agent metadata or null if not found
   */
  getAgentMetadata(agentType: string): {
    id: string;
    name: string;
    description: string;
    entityTypes: string[];
  } | null {
    const AgentClass = this.agents.get(agentType);
    if (!AgentClass) {
      return null;
    }

    // Create temporary instance to read config
    const tempAgent = new AgentClass(
      this.providerRegistry,
      this.contextLoader,
      this.conversationService,
      this.skillRegistry,
      this.rateLimiter,
      this.actionCatalog,
      this.actionExecutor,
    );

    return {
      id: tempAgent.id,
      name: tempAgent.name,
      description: tempAgent.description,
      entityTypes: tempAgent.entityTypes,
    };
  }

  /**
   * Clear a specific agent instance from cache.
   *
   * @param agentType - Agent type ID
   * @param context - Agent context
   * @returns true if instance was cleared
   */
  clearInstance(agentType: string, context: AgentContext): boolean {
    const contextKey = this.buildContextKey(agentType, context);
    return this.agentInstances.delete(contextKey);
  }

  /**
   * Clear all cached agent instances.
   * Useful for testing or context reset.
   */
  clearAllInstances(): void {
    const count = this.agentInstances.size;
    this.agentInstances.clear();
    this.logger.debug(`Cleared ${count} agent instances`);
  }

  /**
   * Get count of cached agent instances.
   * Useful for monitoring and diagnostics.
   */
  getInstanceCount(): number {
    return this.agentInstances.size;
  }

  /**
   * Get cache statistics for monitoring.
   * Returns current size, max size, and TTL configuration.
   */
  getCacheStats(): { size: number; max: number; ttl: number } {
    return {
      size: this.agentInstances.size,
      max: AGENT_CACHE_MAX_SIZE,
      ttl: AGENT_CACHE_TTL_MS,
    };
  }

  /**
   * Build a unique context key for caching agent instances.
   *
   * @param agentType - Agent type ID
   * @param context - Agent context
   * @returns Unique context key string
   */
  private buildContextKey(agentType: string, context: AgentContext): string {
    return `${agentType}:${context.organizationId}:${context.userId}:${context.entityType || "none"}:${context.entityId || "none"}`;
  }
}

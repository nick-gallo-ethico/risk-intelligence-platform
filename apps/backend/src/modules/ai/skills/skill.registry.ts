import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
  zodToJsonSchema,
} from "./skill.types";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { PromptService } from "../services/prompt.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { AITool } from "../interfaces/ai-provider.interface";
import { getErrorMessage } from "@common/utils";

// Import platform skills
import { noteCleanupSkill } from "./platform/note-cleanup.skill";
import { summarizeSkill } from "./platform/summarize.skill";
import { categorySuggestSkill } from "./platform/category-suggest.skill";
import { riskScoreSkill } from "./platform/risk-score.skill";
import { translateSkill } from "./platform/translate.skill";

// Import chatbot skills
import { faqMatchSkill } from "./chatbot/faq-match.skill";
import { policySearchSkill } from "./chatbot/policy-search.skill";
import { caseStatusSkill } from "./chatbot/case-status.skill";

// Chatbot skill dependencies (optional to avoid circular deps)
import { FaqService } from "../../chatbot/services/faq.service";
import { CaseStatusService } from "../../chatbot/services/case-status.service";
import { VectorStoreService } from "../../embeddings/services/vector-store.service";
import { EmbeddingService } from "../../embeddings/services/embedding.service";

// TODO: Register triage skill when disclosures module integration is ready
// The triage skill (./triage.skill.ts) is complete but requires:
// - AiTriageService from disclosures module
// - SchemaIntrospectionService from AI module
// Registration requires either:
// 1. Injecting these services into SkillRegistry (may create circular deps)
// 2. Using a lazy registration pattern from DisclosuresModule
// 3. Using a shared skills module that both can import
// See: RS.47 for bulk triage safety patterns implemented in triage.skill.ts

/**
 * SkillRegistry manages registration and execution of AI skills.
 *
 * Skills are reusable AI capabilities that can be invoked from:
 * - The AI panel via chat commands
 * - Quick action buttons
 * - Programmatic API calls
 *
 * Features:
 * - Permission-based access control
 * - Entity-type restrictions
 * - Rate limiting integration
 * - Input validation via Zod
 * - Claude tool format conversion
 *
 * Usage:
 * ```typescript
 * // Get available skills for a user
 * const skills = registry.getAvailableSkills({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   userPermissions: ['ai:skills:note-cleanup', 'ai:skills:summarize'],
 * });
 *
 * // Execute a skill
 * const result = await registry.executeSkill('note-cleanup', {
 *   content: 'my notes here',
 *   style: 'light',
 * }, {
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 *   permissions: ['ai:skills:note-cleanup'],
 * });
 * ```
 */
@Injectable()
export class SkillRegistry implements OnModuleInit {
  private readonly logger = new Logger(SkillRegistry.name);
  private readonly skills = new Map<string, SkillDefinition>();

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly promptService: PromptService,
    private readonly contextLoader: ContextLoaderService,
    // Chatbot skill dependencies - optional to avoid circular deps
    @Optional() private readonly faqService?: FaqService,
    @Optional() private readonly caseStatusService?: CaseStatusService,
    @Optional() private readonly vectorStore?: VectorStoreService,
    @Optional() private readonly embeddingService?: EmbeddingService,
  ) {}

  onModuleInit() {
    // Register platform skills
    // Type assertions needed because SkillDefinition<T, U> has contravariant input types
    this.registerSkill(
      noteCleanupSkill(
        this.providerRegistry,
        this.rateLimiter,
        this.promptService,
      ) as SkillDefinition,
    );
    this.registerSkill(
      summarizeSkill(
        this.providerRegistry,
        this.rateLimiter,
        this.promptService,
      ) as SkillDefinition,
    );
    this.registerSkill(
      categorySuggestSkill(
        this.providerRegistry,
        this.rateLimiter,
        this.promptService,
      ) as SkillDefinition,
    );
    this.registerSkill(
      riskScoreSkill(
        this.providerRegistry,
        this.rateLimiter,
        this.promptService,
      ) as SkillDefinition,
    );
    this.registerSkill(
      translateSkill(
        this.providerRegistry,
        this.rateLimiter,
        this.promptService,
      ) as SkillDefinition,
    );

    // Register chatbot skills if dependencies are available
    this.registerChatbotSkills();

    this.logger.log(`Registered ${this.skills.size} skills`);
  }

  /**
   * Register chatbot skills for FAQ matching, policy search, and case status.
   * Skills only registered if required dependencies are available.
   * This avoids hard circular dependencies between AI and Chatbot modules.
   */
  private registerChatbotSkills(): void {
    // faq-match skill requires FaqService
    if (this.faqService) {
      this.registerSkill(faqMatchSkill(this.faqService) as SkillDefinition);
      this.logger.debug("Registered faq-match skill");
    } else {
      this.logger.debug("Skipping faq-match skill - FaqService not available");
    }

    // policy-search skill requires FaqService, VectorStore, and EmbeddingService
    if (this.faqService && this.vectorStore && this.embeddingService) {
      this.registerSkill(
        policySearchSkill(
          this.faqService,
          this.vectorStore,
          this.embeddingService,
          this.providerRegistry,
        ) as SkillDefinition,
      );
      this.logger.debug("Registered policy-search skill");
    } else {
      this.logger.debug(
        "Skipping policy-search skill - VectorStoreService or EmbeddingService not available",
      );
    }

    // case-status skill requires CaseStatusService
    if (this.caseStatusService) {
      this.registerSkill(
        caseStatusSkill(this.caseStatusService) as SkillDefinition,
      );
      this.logger.debug("Registered case-status skill");
    } else {
      this.logger.debug(
        "Skipping case-status skill - CaseStatusService not available",
      );
    }
  }

  /**
   * Register a skill.
   * Can be used to add custom skills at runtime.
   *
   * @param skill - Skill definition to register
   */
  registerSkill(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      this.logger.warn(`Overwriting skill: ${skill.id}`);
    }
    this.skills.set(skill.id, skill);
    this.logger.debug(`Registered skill: ${skill.id}`);
  }

  /**
   * Get a skill by ID.
   *
   * @param id - Skill identifier
   * @returns Skill definition or undefined if not found
   */
  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  /**
   * Get skills available for the given context.
   * Filters by scope, entity type, and permissions.
   *
   * @param params - Filter parameters
   * @returns Array of available skill definitions
   */
  getAvailableSkills(params: {
    organizationId: string;
    userId: string;
    teamId?: string;
    entityType?: string;
    userPermissions: string[];
  }): SkillDefinition[] {
    return Array.from(this.skills.values()).filter((skill) => {
      // Check scope
      if (
        skill.scope === SkillScope.ORG &&
        skill.scopeId !== params.organizationId
      ) {
        return false;
      }
      if (skill.scope === SkillScope.TEAM && skill.scopeId !== params.teamId) {
        return false;
      }
      if (skill.scope === SkillScope.USER && skill.scopeId !== params.userId) {
        return false;
      }

      // Check entity type restriction
      if (skill.entityTypes && params.entityType) {
        if (!skill.entityTypes.includes(params.entityType)) {
          return false;
        }
      }

      // Check permissions
      return skill.requiredPermissions.every((p) =>
        params.userPermissions.includes(p),
      );
    });
  }

  /**
   * Execute a skill.
   * Validates input, checks permissions, and runs the skill.
   *
   * @param skillId - ID of skill to execute
   * @param input - Skill input (validated against skill's schema)
   * @param context - Execution context
   * @returns Skill result with data or error
   */
  async executeSkill<T = unknown>(
    skillId: string,
    input: unknown,
    context: SkillContext,
  ): Promise<SkillResult<T>> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { success: false, error: `Skill not found: ${skillId}` };
    }

    // Check permissions
    const hasPermission = skill.requiredPermissions.every((p) =>
      context.permissions.includes(p),
    );
    if (!hasPermission) {
      return {
        success: false,
        error: "Insufficient permissions for this skill",
      };
    }

    // Check entity type
    if (skill.entityTypes && context.entityType) {
      if (!skill.entityTypes.includes(context.entityType)) {
        return {
          success: false,
          error: `Skill not available for entity type: ${context.entityType}`,
        };
      }
    }

    try {
      // Validate input
      const validatedInput = skill.inputSchema.parse(input);

      // Execute skill
      const result = await skill.execute(validatedInput, context);

      return result as SkillResult<T>;
    } catch (error) {
      const err = error as { name?: string };
      const errorMessage = getErrorMessage(error);
      if (err.name === "ZodError") {
        return { success: false, error: `Invalid input: ${errorMessage}` };
      }
      this.logger.error(`Skill ${skillId} failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage || "Skill execution failed",
      };
    }
  }

  /**
   * Convert available skills to Claude tool format.
   * Used when exposing skills as AI tools for function calling.
   *
   * @param skills - Skills to convert
   * @returns Array of AITool definitions
   */
  toClaudeTools(skills: SkillDefinition[]): AITool[] {
    return skills.map((skill) => ({
      name: skill.id,
      description: skill.description,
      inputSchema: zodToJsonSchema(skill.inputSchema),
    }));
  }

  /**
   * List all registered skill IDs.
   *
   * @returns Array of skill IDs
   */
  listSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Unregister a skill by ID.
   * Used for removing org/team/user-specific skills.
   *
   * @param skillId - ID of skill to remove
   * @returns true if skill was removed, false if not found
   */
  unregisterSkill(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  /**
   * Get skill count by scope.
   * Useful for diagnostics and monitoring.
   *
   * @returns Object with counts per scope
   */
  getSkillCountsByScope(): Record<SkillScope, number> {
    const counts = {
      [SkillScope.PLATFORM]: 0,
      [SkillScope.ORG]: 0,
      [SkillScope.TEAM]: 0,
      [SkillScope.USER]: 0,
    };

    for (const skill of this.skills.values()) {
      counts[skill.scope]++;
    }

    return counts;
  }
}

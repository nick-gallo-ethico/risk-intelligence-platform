import { BaseAgent, AgentConfig, AgentContext } from "./base.agent";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { ActionCatalog } from "../actions/action.catalog";
import { ActionExecutorService } from "../actions/action-executor.service";

/**
 * Agent configuration for case management workflows.
 */
const CASE_AGENT_CONFIG: AgentConfig = {
  id: "case",
  name: "Case Agent",
  description:
    "AI assistant for case management - triage, categorization, linking reports, and case summaries.",
  entityTypes: ["case"],
  defaultSkills: [
    "note-cleanup",
    "summarize",
    "category-suggest",
    "risk-score",
    "translate",
  ],
  systemPromptTemplate: "case-agent",
};

/**
 * CaseAgent is specialized for case management workflows.
 *
 * Capabilities:
 * - Summarize case intake information
 * - Categorize reports by type and severity
 * - Identify key parties and relationships
 * - Track case status and SLA compliance
 * - Generate case briefings for stakeholders
 * - Recommend case routing and assignment
 *
 * Cases are mutable work containers (per WORKING-DECISIONS.md)
 * that contain classification, pipeline status, assignments,
 * investigations, and outcomes.
 */
export class CaseAgent extends BaseAgent {
  constructor(
    providerRegistry: ProviderRegistryService,
    contextLoader: ContextLoaderService,
    conversationService: ConversationService,
    skillRegistry: SkillRegistry,
    rateLimiter: AiRateLimiterService,
    actionCatalog?: ActionCatalog,
    actionExecutor?: ActionExecutorService,
  ) {
    super(
      CASE_AGENT_CONFIG,
      providerRegistry,
      contextLoader,
      conversationService,
      skillRegistry,
      rateLimiter,
      actionCatalog,
      actionExecutor,
    );
  }

  /**
   * Get context-aware suggested prompts for case management.
   *
   * @param context - Agent context
   * @returns Array of suggested prompt strings
   */
  getSuggestedPrompts(context: AgentContext): string[] {
    const prompts: string[] = [
      "Summarize this case",
      "Suggest a category for this report",
      "Are there related cases to link?",
      "What is the risk level?",
      "Clean up the intake notes",
      "Draft a response to the reporter",
    ];

    // Add context-specific prompts
    if (context.entityType === "case" && context.entityId) {
      prompts.push("Who should this case be assigned to?");
      prompts.push("What's the SLA status?");
      prompts.push("Generate a case briefing");
    }

    return prompts;
  }

  /**
   * Get additional skills specific to case management.
   * These are skills beyond the default set that this agent can use.
   */
  protected getAdditionalSkills(): string[] {
    // Case-specific skills (to be implemented in future plans)
    return [
      // 'find-related-cases',
      // 'draft-reporter-response',
      // 'suggest-assignment',
      // 'sla-analysis',
    ];
  }
}

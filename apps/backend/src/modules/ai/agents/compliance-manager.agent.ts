import { BaseAgent, AgentConfig, AgentContext } from "./base.agent";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { ActionCatalog } from "../actions/action.catalog";
import { ActionExecutorService } from "../actions/action-executor.service";

/**
 * Agent configuration for compliance manager (org-wide) workflows.
 */
const COMPLIANCE_MANAGER_AGENT_CONFIG: AgentConfig = {
  id: "compliance-manager",
  name: "Compliance Manager Agent",
  description:
    "Organization-wide AI assistant for compliance officers - trends, reporting, policy questions, and program management.",
  entityTypes: ["campaign", "policy", "report"],
  requiredRole: "COMPLIANCE_OFFICER",
  defaultSkills: [
    "note-cleanup",
    "summarize",
    "category-suggest",
    "risk-score",
    "translate",
  ],
  systemPromptTemplate: "base", // Falls back to base until specific template exists
};

/**
 * ComplianceManagerAgent is the organization-wide compliance assistant.
 *
 * Capabilities:
 * - Organization-wide compliance trend analysis
 * - Cross-case pattern detection
 * - Policy violation tracking
 * - Risk heat map generation
 * - Regulatory compliance monitoring
 * - Board reporting preparation
 *
 * Per CONTEXT.md, this is a role-scoped agent for compliance officers
 * that provides org-wide visibility and analytics capabilities.
 */
export class ComplianceManagerAgent extends BaseAgent {
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
      COMPLIANCE_MANAGER_AGENT_CONFIG,
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
   * Get context-aware suggested prompts for compliance management.
   *
   * @param context - Agent context
   * @returns Array of suggested prompt strings
   */
  getSuggestedPrompts(context: AgentContext): string[] {
    const prompts: string[] = [
      "Show me trends in the last quarter",
      "What are the most common case types?",
      "Draft a board report summary",
      "Which departments have the most open cases?",
      "What campaigns are due this month?",
      "Summarize policy compliance status",
    ];

    // Add context-specific prompts based on entity type
    if (context.entityType === "campaign") {
      prompts.push("What's the campaign completion rate?");
      prompts.push("Who hasn't responded yet?");
      prompts.push("Draft a reminder message");
    } else if (context.entityType === "policy") {
      prompts.push("Who needs to attest to this policy?");
      prompts.push("What changes were made in this version?");
      prompts.push("Draft an attestation reminder");
    }

    return prompts;
  }

  /**
   * Get additional skills specific to compliance management.
   * These are skills beyond the default set that this agent can use.
   */
  protected getAdditionalSkills(): string[] {
    // Org-wide skills (to be implemented in future plans)
    return [
      // 'generate-trend-report',
      // 'natural-language-query',
      // 'draft-board-report',
      // 'risk-heat-map',
    ];
  }
}

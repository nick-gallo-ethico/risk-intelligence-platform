import { BaseAgent, AgentConfig, AgentContext } from "./base.agent";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";

/**
 * Agent configuration for investigation workflows.
 */
const INVESTIGATION_AGENT_CONFIG: AgentConfig = {
  id: "investigation",
  name: "Investigation Agent",
  description:
    "AI assistant specialized for investigation workflows - interviews, evidence analysis, and findings documentation.",
  entityTypes: ["investigation"],
  requiredRole: "INVESTIGATOR",
  defaultSkills: [
    "note-cleanup",
    "summarize",
    "risk-score",
    "translate",
  ],
  systemPromptTemplate: "investigation-agent",
};

/**
 * InvestigationAgent is specialized for investigation workflows.
 *
 * Capabilities:
 * - Summarize investigation findings and timelines
 * - Clean up interview notes and call recordings
 * - Suggest interview questions based on case details
 * - Draft communications to witnesses and subjects
 * - Identify patterns across related cases
 * - Assess risk levels and recommend next steps
 *
 * Per CONTEXT.md, investigators have a full toolkit including:
 * summarize, clean notes, suggest questions, draft communications,
 * categorize, and risk score.
 */
export class InvestigationAgent extends BaseAgent {
  constructor(
    providerRegistry: ProviderRegistryService,
    contextLoader: ContextLoaderService,
    conversationService: ConversationService,
    skillRegistry: SkillRegistry,
    rateLimiter: AiRateLimiterService,
  ) {
    super(
      INVESTIGATION_AGENT_CONFIG,
      providerRegistry,
      contextLoader,
      conversationService,
      skillRegistry,
      rateLimiter,
    );
  }

  /**
   * Get context-aware suggested prompts for investigation workflows.
   *
   * @param context - Agent context
   * @returns Array of suggested prompt strings
   */
  getSuggestedPrompts(context: AgentContext): string[] {
    const prompts: string[] = [
      "Summarize this investigation",
      "Clean up my interview notes",
      "What questions should I ask the subject?",
      "Generate a risk assessment",
      "Draft the findings section",
      "Are there similar cases to this investigation?",
    ];

    // Add context-specific prompts
    if (context.entityType === "investigation" && context.entityId) {
      prompts.push("Draft a timeline of events");
      prompts.push("Identify key witnesses I should interview");
      prompts.push("What evidence is missing?");
    }

    return prompts;
  }

  /**
   * Get additional skills specific to investigation workflows.
   * These are skills beyond the default set that this agent can use.
   */
  protected getAdditionalSkills(): string[] {
    // Investigation-specific skills (to be implemented in future plans)
    return [
      // 'draft-interview-questions',
      // 'analyze-evidence',
      // 'find-similar-cases',
      // 'timeline-generation',
    ];
  }
}

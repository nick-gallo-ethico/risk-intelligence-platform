import { z } from 'zod';
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from './skill.types';
import {
  AiTriageService,
  TriageInterpretation,
  TriagePreview,
} from '../../disclosures/ai-triage.service';
import { SchemaIntrospectionService } from '../schema-introspection.service';

/**
 * Input schema for triage skill.
 * Validates natural language query and entity type.
 */
export const triageInputSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(500)
    .describe(
      'Natural language query like "approve all under $100" or "dismiss low severity vendor matches"',
    ),
  entityType: z
    .enum(['disclosure', 'conflict'])
    .describe('Type of entity to triage: disclosure or conflict'),
});

export type TriageInput = z.infer<typeof triageInputSchema>;

/**
 * Output from triage skill.
 * Returns pending confirmation with preview data.
 */
export interface TriageOutput {
  status: 'pending_confirmation' | 'executed' | 'cancelled';
  preview?: {
    /** Natural language query that was interpreted */
    query: string;
    /** AI interpretation of the query */
    interpretation: TriageInterpretation;
    /** Number of items matching the query */
    matchCount: number;
    /** Sample items for preview (max 10) */
    sampleItems: Array<{
      id: string;
      referenceNumber?: string;
      status: string;
      type?: string;
      value?: number;
      severity?: string;
      summary?: string;
    }>;
    /** Preview ID for confirmation */
    previewId: string;
    /** Impact assessment */
    impact: {
      estimatedDurationMs: number;
      totalValueAffected?: number;
      statusBreakdown: Record<string, number>;
    };
  };
  result?: {
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
    durationMs: number;
  };
  message: string;
}

/**
 * Create the triage skill for AI agent integration.
 *
 * This skill enables natural language bulk processing of disclosures and conflicts.
 * It follows the preview-first pattern: queries are interpreted and previewed
 * before any action is taken.
 *
 * Safety patterns (RS.47):
 * - Table always shown first (preview)
 * - Explicit confirmation required to execute
 * - Preview expires after 5 minutes
 * - Full audit trail with AI attribution
 *
 * Usage flow:
 * 1. User provides NL query: "approve all disclosures under $100"
 * 2. Skill interprets query and generates preview
 * 3. User reviews preview table in UI
 * 4. User confirms to execute (separate action, not through this skill)
 *
 * @param triageService - AI triage service for NL processing
 * @param schemaService - Schema introspection for validation
 * @returns Triage skill definition
 *
 * @example
 * ```typescript
 * // Register skill
 * const skill = triageSkill(triageService, schemaService);
 * registry.registerSkill(skill);
 *
 * // Execute via chat
 * const result = await registry.executeSkill('triage', {
 *   query: 'dismiss all low severity vendor matches',
 *   entityType: 'conflict',
 * }, context);
 *
 * // Result is pending_confirmation with preview
 * console.log(result.data.preview.matchCount); // 47
 * console.log(result.data.preview.previewId); // "abc-123-..."
 * ```
 */
export function triageSkill(
  triageService: AiTriageService,
  schemaService: SchemaIntrospectionService,
): SkillDefinition<TriageInput, TriageOutput> {
  return {
    id: 'triage',
    name: 'Bulk Triage',
    description:
      'Bulk process disclosures or conflicts using natural language queries. ' +
      'Examples: "approve all under $100", "dismiss low severity vendor matches", ' +
      '"reject all pending disclosures older than 30 days". ' +
      'Returns a preview table for confirmation before executing.',
    scope: SkillScope.PLATFORM,
    entityTypes: ['disclosure', 'conflict'], // Only available for these entity types
    requiredPermissions: ['ai:skills:triage', 'disclosure:bulk:execute'],

    inputSchema: triageInputSchema,

    async execute(
      input: TriageInput,
      context: SkillContext,
    ): Promise<SkillResult<TriageOutput>> {
      const startTime = Date.now();

      try {
        // 1. Interpret the natural language query
        const interpretation = await triageService.interpretQuery(
          {
            query: input.query,
            entityType: input.entityType,
          },
          context.organizationId,
        );

        // Check confidence and add warning if low
        if (interpretation.confidence < 0.7) {
          interpretation.warnings.push(
            `Low confidence interpretation (${Math.round(interpretation.confidence * 100)}%). Please verify the preview carefully.`,
          );
        }

        // 2. Generate preview (NO ACTION TAKEN)
        const preview = await triageService.previewAction(
          interpretation,
          context.organizationId,
        );

        // 3. Return preview for confirmation (DO NOT EXECUTE)
        const output: TriageOutput = {
          status: 'pending_confirmation',
          preview: {
            query: input.query,
            interpretation,
            matchCount: preview.count,
            sampleItems: preview.items.slice(0, 10).map((item) => ({
              id: item.id,
              referenceNumber: item.referenceNumber,
              status: item.status,
              type: item.type,
              value: item.value,
              severity: item.severity,
              summary: item.summary,
            })),
            previewId: preview.id,
            impact: preview.impact,
          },
          message: buildPreviewMessage(preview, interpretation),
        };

        return {
          success: true,
          data: output,
          metadata: {
            durationMs: Date.now() - startTime,
          },
        };
      } catch (error) {
        const err = error as Error;
        return {
          success: false,
          error: err.message || 'Failed to interpret triage query',
          metadata: {
            durationMs: Date.now() - startTime,
          },
        };
      }
    },
  };
}

/**
 * Build a human-readable preview message for the triage results.
 */
function buildPreviewMessage(
  preview: TriagePreview,
  interpretation: TriageInterpretation,
): string {
  const { count, impact } = preview;
  const { action, entityType, confidence, warnings } = interpretation;

  let message = `Found ${count} ${entityType}${count !== 1 ? 's' : ''} matching "${interpretation.originalQuery}".\n\n`;

  message += `**Action:** ${formatAction(action)}\n`;
  message += `**Confidence:** ${Math.round(confidence * 100)}%\n`;
  message += `**Estimated time:** ${formatDuration(impact.estimatedDurationMs)}\n`;

  if (impact.totalValueAffected !== undefined) {
    message += `**Total value affected:** $${impact.totalValueAffected.toLocaleString()}\n`;
  }

  if (Object.keys(impact.statusBreakdown).length > 0) {
    message += '\n**Status breakdown:**\n';
    for (const [status, statusCount] of Object.entries(impact.statusBreakdown)) {
      message += `- ${status}: ${statusCount}\n`;
    }
  }

  if (warnings.length > 0) {
    message += '\n**Warnings:**\n';
    for (const warning of warnings) {
      message += `- ${warning}\n`;
    }
  }

  message += `\nReview the table above and confirm to proceed.`;

  return message;
}

/**
 * Format action name for display.
 */
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    approve: 'Approve',
    reject: 'Reject',
    request_info: 'Request Additional Info',
    dismiss: 'Dismiss',
    escalate: 'Escalate to Case',
    resolve: 'Resolve',
  };
  return actionMap[action] || action;
}

/**
 * Format duration for display.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${Math.round(ms / 60000)}m`;
}

import { Injectable, Logger } from "@nestjs/common";
import {
  TriageInterpreterService,
  TriageInterpretation,
  InterpretQueryInput,
  TriageEntityType,
  TriageAction,
} from "./services/triage-interpreter.service";
import {
  TriagePreviewService,
  TriagePreview,
  TriagePreviewItem,
} from "./services/triage-preview.service";
import {
  TriageExecutorService,
  TriageResult,
} from "./services/triage-executor.service";

// Re-export types for backward compatibility
export {
  TriageEntityType,
  TriageAction,
  TriageInterpretation,
  InterpretQueryInput,
} from "./services/triage-interpreter.service";
export {
  TriagePreview,
  TriagePreviewItem,
} from "./services/triage-preview.service";
export { TriageResult } from "./services/triage-executor.service";

/**
 * AiTriageService provides AI-assisted bulk processing of disclosures and conflicts.
 *
 * RS.47: Natural language bulk processing with safeguards.
 *
 * Features:
 * - Interprets natural language queries into structured filters
 * - Previews results before execution (table view)
 * - Requires explicit confirmation for execution
 * - Full audit trail with AI attribution
 * - 5-minute preview expiration to prevent stale execution
 *
 * Safety patterns:
 * - Preview always shown first (no direct execution)
 * - Explicit confirm:true required for execute
 * - Preview cached with TTL for idempotency
 * - AI actions logged to AiAction table for undo
 * - All mutations logged to audit trail
 *
 * Architecture:
 * This is a thin coordinator service that delegates to focused sub-services:
 * - TriageInterpreterService: NL query -> structured filters/action
 * - TriagePreviewService: Generate previews with impact assessment
 * - TriageExecutorService: Execute bulk actions with audit logging
 *
 * @example
 * ```typescript
 * // 1. Interpret NL query
 * const interpretation = await triageService.interpretQuery({
 *   query: 'approve all under $100',
 *   entityType: 'disclosure',
 * }, organizationId);
 *
 * // 2. Generate preview
 * const preview = await triageService.previewAction(interpretation, organizationId);
 * console.log(`Found ${preview.count} items`);
 *
 * // 3. Execute with confirmation
 * const result = await triageService.executeAction(
 *   preview.id,
 *   true, // confirm
 *   organizationId,
 *   userId,
 * );
 * ```
 */
@Injectable()
export class AiTriageService {
  private readonly logger = new Logger(AiTriageService.name);

  constructor(
    private readonly triageInterpreter: TriageInterpreterService,
    private readonly triagePreview: TriagePreviewService,
    private readonly triageExecutor: TriageExecutorService,
  ) {}

  /**
   * Interpret a natural language query into structured filters and action.
   *
   * @param input - Query and entity type
   * @param organizationId - Organization context
   * @returns Interpretation with filters, action, confidence
   */
  async interpretQuery(
    input: InterpretQueryInput,
    organizationId: string,
  ): Promise<TriageInterpretation> {
    this.logger.debug(
      `Coordinating query interpretation for: "${input.query}"`,
    );
    return this.triageInterpreter.interpretQuery(input, organizationId);
  }

  /**
   * Generate a preview of the triage action.
   * NO ACTION IS TAKEN - read only operation.
   *
   * @param interpretation - Parsed interpretation from interpretQuery
   * @param organizationId - Organization context
   * @returns Preview with matching items and impact assessment
   */
  async previewAction(
    interpretation: TriageInterpretation,
    organizationId: string,
  ): Promise<TriagePreview> {
    this.logger.debug(
      `Coordinating preview generation for ${interpretation.action}`,
    );
    return this.triagePreview.generatePreview(interpretation, organizationId);
  }

  /**
   * Execute a triage action after preview confirmation.
   *
   * @param previewId - Preview ID from previewAction
   * @param confirm - Must be true to execute
   * @param organizationId - Organization context
   * @param userId - User performing the action
   * @returns Execution result with success/failure counts
   */
  async executeAction(
    previewId: string,
    confirm: boolean,
    organizationId: string,
    userId: string,
  ): Promise<TriageResult> {
    this.logger.debug(`Coordinating triage execution for preview ${previewId}`);
    return this.triageExecutor.executeAction(
      previewId,
      confirm,
      organizationId,
      userId,
    );
  }

  /**
   * Cancel a preview and clear from cache.
   *
   * @param previewId - Preview ID to cancel
   */
  async cancelPreview(previewId: string): Promise<void> {
    this.logger.debug(`Coordinating preview cancellation: ${previewId}`);
    return this.triagePreview.cancelPreview(previewId);
  }
}

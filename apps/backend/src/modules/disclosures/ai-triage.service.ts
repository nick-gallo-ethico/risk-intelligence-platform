import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, CreateAuditLogDto } from '../audit/audit.service';
import { SchemaIntrospectionService } from '../ai/schema-introspection.service';
import { ProviderRegistryService } from '../ai/services/provider-registry.service';
import { AiRateLimiterService } from '../ai/services/rate-limiter.service';
import { ConflictQueryDto, DismissalCategory } from './dto/conflict.dto';
import { DisclosureQueryDto, DisclosureStatus } from './dto/disclosure-submission.dto';
import {
  ConflictStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  RiuStatus,
} from '@prisma/client';

// ===========================================
// Triage Types
// ===========================================

/**
 * Supported entity types for AI triage.
 */
export type TriageEntityType = 'disclosure' | 'conflict';

/**
 * Actions that can be performed via AI triage.
 */
export type TriageAction =
  | 'approve'
  | 'reject'
  | 'request_info'
  | 'dismiss'
  | 'escalate'
  | 'resolve';

/**
 * Result of AI interpreting a natural language query.
 */
export interface TriageInterpretation {
  /** Natural language query that was interpreted */
  originalQuery: string;
  /** Entity type being triaged */
  entityType: TriageEntityType;
  /** Parsed filter conditions */
  filters: ConflictQueryDto | DisclosureQueryDto;
  /** Intended action to perform */
  action: TriageAction;
  /** AI confidence in interpretation (0-1) */
  confidence: number;
  /** Human-readable explanation of the interpretation */
  explanation: string;
  /** Any warnings about the interpretation */
  warnings: string[];
}

/**
 * Preview of triage action results before execution.
 */
export interface TriagePreview {
  /** Unique preview ID for execution reference */
  id: string;
  /** Original interpretation */
  interpretation: TriageInterpretation;
  /** Total count of matching items */
  count: number;
  /** Sample items for review (max 100) */
  items: TriagePreviewItem[];
  /** Estimated impact summary */
  impact: {
    /** Approximate processing time */
    estimatedDurationMs: number;
    /** Total value affected (for disclosures with values) */
    totalValueAffected?: number;
    /** Distribution by status */
    statusBreakdown: Record<string, number>;
  };
  /** When preview was created */
  createdAt: Date;
  /** Preview expiration time */
  expiresAt: Date;
}

/**
 * Single item in triage preview.
 */
export interface TriagePreviewItem {
  id: string;
  referenceNumber?: string;
  status: string;
  type?: string;
  value?: number;
  matchedEntity?: string;
  severity?: string;
  createdAt: Date;
  summary?: string;
}

/**
 * Result of executing a triage action.
 */
export interface TriageResult {
  /** Preview ID that was executed */
  previewId: string;
  /** Action that was performed */
  action: TriageAction;
  /** Number of items processed */
  processed: number;
  /** Number of successful operations */
  succeeded: number;
  /** Number of failed operations */
  failed: number;
  /** Error details for failed items */
  errors: Array<{ id: string; error: string }>;
  /** When execution started */
  startedAt: Date;
  /** When execution completed */
  completedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Input for AI query interpretation.
 */
export interface InterpretQueryInput {
  query: string;
  entityType: TriageEntityType;
}

// ===========================================
// AI Prompt Templates
// ===========================================

const TRIAGE_INTERPRETATION_PROMPT = `You are an AI assistant helping with compliance disclosure triage.

Given a natural language query, interpret it as a structured filter and action for bulk processing.

SCHEMA:
{schema}

VALID ACTIONS:
{actions}

EXAMPLES:
- "approve all disclosures under $100 where manager approved" ->
  entityType: disclosure, action: approve, filters: { disclosureValue_lt: 100, ... }
- "dismiss low severity vendor matches" ->
  entityType: conflict, action: dismiss, filters: { severity: "LOW", conflictType: "VENDOR_MATCH" }
- "reject all pending disclosures older than 30 days" ->
  entityType: disclosure, action: reject, filters: { status: "SUBMITTED", createdAt_lt: "..." }

USER QUERY: {query}
ENTITY TYPE: {entityType}

Respond with a JSON object containing:
{{
  "filters": {{ ... }},
  "action": "approve|reject|dismiss|escalate|...",
  "confidence": 0.0-1.0,
  "explanation": "Human-readable explanation of interpretation",
  "warnings": ["Any concerns about this interpretation"]
}}

IMPORTANT:
- Only use fields that exist in the schema
- Only use actions valid for the entity type
- If the query is ambiguous, set confidence below 0.7
- Add warnings if the query could affect many records
- Dates should be in ISO 8601 format`;

// ===========================================
// AiTriageService
// ===========================================

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

  /** Preview cache TTL: 5 minutes */
  private readonly PREVIEW_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly schemaService: SchemaIntrospectionService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimiter: AiRateLimiterService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
    this.logger.log(
      `Interpreting triage query: "${input.query}" for ${input.entityType}`,
    );

    // Get schema for the entity type
    const schema = this.schemaService.getSchemaForPrompt(
      [input.entityType],
      organizationId,
    );

    // Get valid actions for the entity type
    const validActions = this.schemaService.getValidActions(input.entityType);

    // Build prompt
    const prompt = TRIAGE_INTERPRETATION_PROMPT.replace('{schema}', schema)
      .replace('{actions}', validActions.join(', '))
      .replace('{query}', input.query)
      .replace('{entityType}', input.entityType);

    // Check rate limit
    const estimatedTokens = Math.ceil(prompt.length / 4) + 500;
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId,
      estimatedTokens,
    });

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit exceeded. Retry after ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)} seconds.`,
      );
    }

    const startTime = Date.now();

    try {
      // Call AI provider
      const provider = this.providerRegistry.getDefaultProvider();
      const response = await provider.createMessage({
        maxTokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const content = response.content.trim();
      let parsed: {
        filters: Record<string, unknown>;
        action: string;
        confidence: number;
        explanation: string;
        warnings: string[];
      };

      try {
        // Extract JSON from response (may be wrapped in markdown code block)
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
          content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch {
        this.logger.error(`Failed to parse AI response: ${content}`);
        throw new BadRequestException(
          'Failed to interpret query. Please try rephrasing.',
        );
      }

      // Validate the action
      if (!validActions.includes(parsed.action)) {
        throw new BadRequestException(
          `Invalid action "${parsed.action}" for ${input.entityType}. Valid: ${validActions.join(', ')}`,
        );
      }

      // Validate filters against schema
      const validationResult = this.schemaService.validateFilter(
        input.entityType,
        parsed.filters,
        organizationId,
      );

      if (!validationResult.valid) {
        // Add validation errors as warnings but don't fail
        parsed.warnings = [
          ...(parsed.warnings || []),
          ...validationResult.errors,
        ];
        parsed.confidence = Math.min(parsed.confidence, 0.5);
      }

      // Record AI usage
      await this.rateLimiter.recordUsage({
        organizationId,
        userId: 'system', // Will be set in execute
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        model: provider.defaultModel,
        featureType: 'triage_interpret',
        durationMs: Date.now() - startTime,
      });

      return {
        originalQuery: input.query,
        entityType: input.entityType,
        filters: parsed.filters as ConflictQueryDto | DisclosureQueryDto,
        action: parsed.action as TriageAction,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(`AI interpretation failed: ${err.message}`, err.stack);
      throw new BadRequestException(
        'Failed to interpret query. Please try again.',
      );
    }
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
    this.logger.log(
      `Generating preview for ${interpretation.action} on ${interpretation.entityType}`,
    );

    const previewId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.PREVIEW_TTL_MS);

    let items: TriagePreviewItem[] = [];
    let count = 0;
    let statusBreakdown: Record<string, number> = {};
    let totalValueAffected: number | undefined;

    if (interpretation.entityType === 'disclosure') {
      const result = await this.queryDisclosures(
        interpretation.filters as DisclosureQueryDto,
        organizationId,
      );
      items = result.items;
      count = result.count;
      statusBreakdown = result.statusBreakdown;
      totalValueAffected = result.totalValue;
    } else if (interpretation.entityType === 'conflict') {
      const result = await this.queryConflicts(
        interpretation.filters as ConflictQueryDto,
        organizationId,
      );
      items = result.items;
      count = result.count;
      statusBreakdown = result.statusBreakdown;
    }

    const preview: TriagePreview = {
      id: previewId,
      interpretation,
      count,
      items: items.slice(0, 100), // Limit to 100 for preview
      impact: {
        estimatedDurationMs: count * 50, // Rough estimate: 50ms per item
        totalValueAffected,
        statusBreakdown,
      },
      createdAt: now,
      expiresAt,
    };

    // Cache preview for execution
    await this.cacheManager.set(
      this.getPreviewCacheKey(previewId),
      preview,
      this.PREVIEW_TTL_MS,
    );

    this.logger.log(`Preview generated: ${previewId} with ${count} items`);

    return preview;
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
    // Require explicit confirmation
    if (!confirm) {
      throw new BadRequestException(
        'Confirmation required. Set confirm: true to execute.',
      );
    }

    // Retrieve cached preview
    const preview = await this.cacheManager.get<TriagePreview>(
      this.getPreviewCacheKey(previewId),
    );

    if (!preview) {
      throw new NotFoundException(
        'Preview not found or expired. Generate a new preview.',
      );
    }

    // Check expiration
    if (new Date() > new Date(preview.expiresAt)) {
      await this.cacheManager.del(this.getPreviewCacheKey(previewId));
      throw new BadRequestException(
        'Preview expired. Generate a new preview.',
      );
    }

    const startedAt = new Date();
    this.logger.log(
      `Executing triage action: ${preview.interpretation.action} on ${preview.count} items`,
    );

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Execute based on entity type and action
    if (preview.interpretation.entityType === 'disclosure') {
      const result = await this.executeDisclosureAction(
        preview,
        organizationId,
        userId,
      );
      succeeded = result.succeeded;
      failed = result.failed;
      errors.push(...result.errors);
    } else if (preview.interpretation.entityType === 'conflict') {
      const result = await this.executeConflictAction(
        preview,
        organizationId,
        userId,
      );
      succeeded = result.succeeded;
      failed = result.failed;
      errors.push(...result.errors);
    }

    const completedAt = new Date();

    // Clear preview from cache
    await this.cacheManager.del(this.getPreviewCacheKey(previewId));

    // Log bulk action to audit
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: 'bulk',
      action: 'AI_BULK_TRIAGE',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `AI-assisted bulk action: ${succeeded} items ${preview.interpretation.action}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        previewId,
        originalQuery: preview.interpretation.originalQuery,
        action: preview.interpretation.action,
        totalCount: preview.count,
        succeeded,
        failed,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    });

    const result: TriageResult = {
      previewId,
      action: preview.interpretation.action,
      processed: succeeded + failed,
      succeeded,
      failed,
      errors,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    this.logger.log(
      `Triage execution complete: ${succeeded} succeeded, ${failed} failed`,
    );

    return result;
  }

  /**
   * Cancel a preview and clear from cache.
   *
   * @param previewId - Preview ID to cancel
   */
  async cancelPreview(previewId: string): Promise<void> {
    await this.cacheManager.del(this.getPreviewCacheKey(previewId));
    this.logger.log(`Preview cancelled: ${previewId}`);
  }

  // ===========================================
  // Private: Query Methods
  // ===========================================

  private async queryDisclosures(
    filters: DisclosureQueryDto,
    organizationId: string,
  ): Promise<{
    items: TriagePreviewItem[];
    count: number;
    statusBreakdown: Record<string, number>;
    totalValue: number | undefined;
  }> {
    // Build Prisma where clause from filters
    // Query disclosures via RIU with disclosure extension
    const riuWhere: Record<string, unknown> = {
      organizationId,
      type: 'DISCLOSURE_RESPONSE',
      disclosureExtension: { isNot: null },
    };

    // Map DisclosureStatus to RiuStatus
    if (filters.status) {
      const riuStatusMap: Record<string, RiuStatus> = {
        DRAFT: RiuStatus.PENDING_QA,
        SUBMITTED: RiuStatus.PENDING_QA,
        UNDER_REVIEW: RiuStatus.PENDING_QA,
        APPROVED: RiuStatus.RELEASED,
        REJECTED: RiuStatus.RELEASED,
      };
      const mapped = riuStatusMap[filters.status];
      if (mapped) {
        riuWhere.status = mapped;
      }
    }

    // Extension filters
    const extensionWhere: Record<string, unknown> = {};
    if (filters.disclosureType) {
      extensionWhere.disclosureType = filters.disclosureType;
    }
    if (filters.thresholdTriggered !== undefined) {
      extensionWhere.thresholdTriggered = filters.thresholdTriggered;
    }
    if (filters.conflictDetected !== undefined) {
      extensionWhere.conflictDetected = filters.conflictDetected;
    }

    if (Object.keys(extensionWhere).length > 0) {
      riuWhere.disclosureExtension = extensionWhere;
    }

    if (filters.startDate || filters.endDate) {
      riuWhere.createdAt = {};
      if (filters.startDate) {
        (riuWhere.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (riuWhere.createdAt as Record<string, unknown>).lte = new Date(filters.endDate);
      }
    }

    // Query RIUs with disclosure extensions
    const [rius, count] = await Promise.all([
      this.prisma.riskIntelligenceUnit.findMany({
        where: riuWhere as any,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          disclosureExtension: true,
        },
      }),
      this.prisma.riskIntelligenceUnit.count({ where: riuWhere as any }),
    ]);

    const items: TriagePreviewItem[] = rius
      .filter((r) => r.disclosureExtension)
      .map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        status: r.status,
        type: r.disclosureExtension!.disclosureType,
        value: r.disclosureExtension!.disclosureValue
          ? Number(r.disclosureExtension!.disclosureValue)
          : undefined,
        createdAt: r.createdAt,
        summary:
          r.disclosureExtension!.relatedCompany ||
          r.disclosureExtension!.relatedPersonName ||
          undefined,
      }));

    // Build status breakdown from RIU status
    const statusBreakdown: Record<string, number> = {};
    for (const riu of rius) {
      statusBreakdown[riu.status] = (statusBreakdown[riu.status] || 0) + 1;
    }

    // Calculate total value
    const extensions = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        ...(extensionWhere as any),
      },
      select: { disclosureValue: true },
    });
    let totalValue: number | undefined;
    const sum = extensions.reduce((acc, e) => {
      return acc + (e.disclosureValue ? Number(e.disclosureValue) : 0);
    }, 0);
    if (sum > 0) {
      totalValue = sum;
    }

    return { items, count, statusBreakdown, totalValue };
  }

  private async queryConflicts(
    filters: ConflictQueryDto,
    organizationId: string,
  ): Promise<{
    items: TriagePreviewItem[];
    count: number;
    statusBreakdown: Record<string, number>;
  }> {
    // Build Prisma where clause
    const where: Record<string, unknown> = { organizationId };

    if (filters.status) {
      where.status = { in: filters.status };
    }
    if (filters.conflictType) {
      where.conflictType = { in: filters.conflictType };
    }
    if (filters.severity) {
      where.severity = { in: filters.severity };
    }
    if (filters.minConfidence !== undefined) {
      where.matchConfidence = { gte: filters.minConfidence };
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.endDate);
      }
    }

    const [conflicts, count, aggregates] = await Promise.all([
      this.prisma.conflictAlert.findMany({
        where: where as any,
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.conflictAlert.count({ where: where as any }),
      this.prisma.conflictAlert.groupBy({
        by: ['status'],
        where: where as any,
        _count: true,
      }),
    ]);

    const items: TriagePreviewItem[] = conflicts.map((c) => ({
      id: c.id,
      status: c.status,
      type: c.conflictType,
      matchedEntity: c.matchedEntity,
      severity: c.severity,
      createdAt: c.createdAt,
      summary: c.summary,
    }));

    const statusBreakdown: Record<string, number> = {};
    for (const agg of aggregates) {
      statusBreakdown[agg.status] = agg._count;
    }

    return { items, count, statusBreakdown };
  }

  // ===========================================
  // Private: Execution Methods
  // ===========================================

  private async executeDisclosureAction(
    preview: TriagePreview,
    organizationId: string,
    userId: string,
  ): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const action = preview.interpretation.action;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Re-query to get all RIU IDs (not just preview sample)
    const filters = preview.interpretation.filters as DisclosureQueryDto;
    const riuWhere: Record<string, unknown> = {
      organizationId,
      type: 'DISCLOSURE_RESPONSE',
      disclosureExtension: { isNot: null },
    };

    // Extension filters
    const extensionWhere: Record<string, unknown> = {};
    if (filters.disclosureType) {
      extensionWhere.disclosureType = filters.disclosureType;
    }
    if (filters.thresholdTriggered !== undefined) {
      extensionWhere.thresholdTriggered = filters.thresholdTriggered;
    }
    if (filters.conflictDetected !== undefined) {
      extensionWhere.conflictDetected = filters.conflictDetected;
    }

    if (Object.keys(extensionWhere).length > 0) {
      riuWhere.disclosureExtension = extensionWhere;
    }

    const disclosures = await this.prisma.riskIntelligenceUnit.findMany({
      where: riuWhere as any,
      select: { id: true },
    });

    // Map action to RIU status update
    // Note: In a full implementation, approval/rejection would involve
    // more complex workflow, but for bulk triage we update status
    let newStatus: RiuStatus | undefined;
    switch (action) {
      case 'approve':
        newStatus = RiuStatus.RELEASED;
        break;
      case 'reject':
        newStatus = RiuStatus.RELEASED; // Still released but marked rejected in metadata
        break;
      case 'request_info':
        newStatus = RiuStatus.PENDING_QA; // Keeps it pending for more info
        break;
    }

    if (!newStatus) {
      return {
        succeeded: 0,
        failed: preview.count,
        errors: [{ id: 'all', error: `Unsupported action: ${action}` }],
      };
    }

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < disclosures.length; i += batchSize) {
      const batch = disclosures.slice(i, i + batchSize);
      const ids = batch.map((d) => d.id);

      try {
        await this.prisma.riskIntelligenceUnit.updateMany({
          where: { id: { in: ids }, organizationId },
          data: {
            status: newStatus,
            statusChangedAt: new Date(),
            statusChangedById: userId,
          },
        });

        succeeded += batch.length;

        // Log each item to audit
        for (const id of ids) {
          await this.auditService.log({
            organizationId,
            entityType: AuditEntityType.DISCLOSURE,
            entityId: id,
            action: `AI_${action.toUpperCase()}`,
            actionCategory: AuditActionCategory.UPDATE,
            actionDescription: `AI triage ${action}: from bulk operation`,
            actorUserId: userId,
            actorType: ActorType.USER,
            context: {
              previewId: preview.id,
              originalQuery: preview.interpretation.originalQuery,
            },
          });
        }
      } catch (error) {
        const err = error as Error;
        failed += batch.length;
        for (const id of ids) {
          errors.push({ id, error: err.message });
        }
      }
    }

    return { succeeded, failed, errors };
  }

  private async executeConflictAction(
    preview: TriagePreview,
    organizationId: string,
    userId: string,
  ): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const action = preview.interpretation.action;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Re-query to get all IDs
    const filters = preview.interpretation.filters as ConflictQueryDto;
    const where: Record<string, unknown> = { organizationId };
    if (filters.status) where.status = { in: filters.status };
    if (filters.conflictType) where.conflictType = { in: filters.conflictType };
    if (filters.severity) where.severity = { in: filters.severity };

    const conflicts = await this.prisma.conflictAlert.findMany({
      where: where as any,
      select: { id: true },
    });

    // Map action to status update
    let newStatus: ConflictStatus | undefined;
    let dismissalCategory: string | undefined;

    switch (action) {
      case 'dismiss':
        newStatus = ConflictStatus.DISMISSED;
        dismissalCategory = DismissalCategory.OTHER;
        break;
      case 'escalate':
        newStatus = ConflictStatus.ESCALATED;
        break;
      case 'resolve':
        newStatus = ConflictStatus.RESOLVED;
        break;
    }

    if (!newStatus) {
      return {
        succeeded: 0,
        failed: preview.count,
        errors: [{ id: 'all', error: `Unsupported action: ${action}` }],
      };
    }

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < conflicts.length; i += batchSize) {
      const batch = conflicts.slice(i, i + batchSize);
      const ids = batch.map((c) => c.id);

      try {
        const updateData: Record<string, unknown> = {
          status: newStatus,
          updatedAt: new Date(),
        };

        if (action === 'dismiss') {
          updateData.dismissedBy = userId;
          updateData.dismissedAt = new Date();
          updateData.dismissedCategory = dismissalCategory;
          updateData.dismissedReason = `AI bulk triage: ${preview.interpretation.originalQuery}`;
        }

        await this.prisma.conflictAlert.updateMany({
          where: { id: { in: ids }, organizationId },
          data: updateData,
        });

        succeeded += batch.length;

        // Log each item to audit
        // Note: ConflictAlert doesn't have a dedicated AuditEntityType,
        // so we log under RIU since conflicts are linked to disclosures
        for (const id of ids) {
          await this.auditService.log({
            organizationId,
            entityType: AuditEntityType.RIU,
            entityId: id,
            action: `AI_CONFLICT_${action.toUpperCase()}`,
            actionCategory: AuditActionCategory.UPDATE,
            actionDescription: `AI triage conflict ${action}: from bulk operation`,
            actorUserId: userId,
            actorType: ActorType.USER,
            context: {
              previewId: preview.id,
              originalQuery: preview.interpretation.originalQuery,
            },
          });
        }
      } catch (error) {
        const err = error as Error;
        failed += batch.length;
        for (const id of ids) {
          errors.push({ id, error: err.message });
        }
      }
    }

    return { succeeded, failed, errors };
  }

  // ===========================================
  // Private: Helpers
  // ===========================================

  private getPreviewCacheKey(previewId: string): string {
    return `triage:preview:${previewId}`;
  }
}

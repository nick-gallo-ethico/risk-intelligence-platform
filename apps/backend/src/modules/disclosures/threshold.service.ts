import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Engine, Rule } from 'json-rules-engine';
import { Decimal } from '@prisma/client/runtime/library';
import { ThresholdAction, ThresholdRule, Prisma, DisclosureType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateThresholdRuleDto,
  UpdateThresholdRuleDto,
  ThresholdRuleResponseDto,
  ThresholdEvaluationResult,
  TriggeredRule,
  AggregateBreakdown,
  RuleConditionDto,
  ConditionOperator,
  ThresholdActionDto,
  AggregateConfigDto,
} from './dto/threshold-rule.dto';

/**
 * Internal result type for rule evaluation
 */
interface RuleEvaluationResult {
  triggered: boolean;
  evaluatedValue: number;
  thresholdValue: number;
  aggregateBreakdown?: AggregateBreakdown;
}

/**
 * ThresholdService manages disclosure threshold rules and evaluations.
 *
 * This service implements the threshold configuration engine per RS.35-RS.38:
 * - RS.35: Policy-driven automation (not immediate pop-ups)
 * - RS.36: Multi-dimensional aggregates (source, category, relationship, time, org hierarchy)
 * - RS.37: Configurable retroactive vs forward-only application
 * - RS.38: Full context bundle linked to auto-created cases
 *
 * Uses json-rules-engine for flexible rule evaluation with support for:
 * - Multiple conditions with AND/OR conjunctions
 * - Rolling window aggregate calculations (days/months/years)
 * - Aggregate functions: SUM, COUNT, AVG, MAX
 * - Multiple action types: FLAG_REVIEW, CREATE_CASE, REQUIRE_APPROVAL, NOTIFY
 */
@Injectable()
export class ThresholdService {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Creates a new threshold rule.
   */
  async create(
    dto: CreateThresholdRuleDto,
    organizationId: string,
    userId: string,
  ): Promise<ThresholdRuleResponseDto> {
    const rule = await this.prisma.thresholdRule.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        disclosureTypes: dto.disclosureTypes,
        conditions: JSON.parse(JSON.stringify(dto.conditions)),
        aggregateConfig: dto.aggregateConfig
          ? JSON.parse(JSON.stringify(dto.aggregateConfig))
          : undefined,
        action: dto.action as ThresholdAction,
        actionConfig: dto.actionConfig
          ? JSON.parse(JSON.stringify(dto.actionConfig))
          : undefined,
        applyMode: dto.applyMode || 'FORWARD_ONLY',
        priority: dto.priority ?? 0,
        createdById: userId,
      },
    });

    await this.auditService.log({
      entityType: 'DISCLOSURE',
      entityId: rule.id,
      action: 'threshold_rule_created',
      actionCategory: 'CREATE',
      actionDescription: `Created threshold rule "${rule.name}" with action ${rule.action}`,
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
    });

    this.logger.log(
      `Created threshold rule ${rule.id} "${rule.name}" in org ${organizationId}`,
    );

    return this.mapToResponse(rule);
  }

  /**
   * Updates an existing threshold rule.
   */
  async update(
    id: string,
    dto: UpdateThresholdRuleDto,
    organizationId: string,
    userId: string,
  ): Promise<ThresholdRuleResponseDto> {
    const existing = await this.findOneOrThrow(id, organizationId);

    const updateData: Prisma.ThresholdRuleUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.disclosureTypes !== undefined)
      updateData.disclosureTypes = dto.disclosureTypes;
    if (dto.conditions !== undefined)
      updateData.conditions = JSON.parse(JSON.stringify(dto.conditions));
    if (dto.aggregateConfig !== undefined)
      updateData.aggregateConfig = JSON.parse(JSON.stringify(dto.aggregateConfig));
    if (dto.action !== undefined)
      updateData.action = dto.action as ThresholdAction;
    if (dto.actionConfig !== undefined)
      updateData.actionConfig = JSON.parse(JSON.stringify(dto.actionConfig));
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.priority !== undefined) updateData.priority = dto.priority;

    const rule = await this.prisma.thresholdRule.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      entityType: 'DISCLOSURE',
      entityId: rule.id,
      action: 'threshold_rule_updated',
      actionCategory: 'UPDATE',
      actionDescription: `Updated threshold rule "${rule.name}"`,
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      changes: { ruleChanges: { old: existing, new: dto } },
    });

    this.logger.log(`Updated threshold rule ${id} in org ${organizationId}`);

    return this.mapToResponse(rule);
  }

  /**
   * Finds a threshold rule by ID.
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<ThresholdRuleResponseDto | null> {
    const rule = await this.prisma.thresholdRule.findFirst({
      where: { id, organizationId },
    });
    return rule ? this.mapToResponse(rule) : null;
  }

  /**
   * Finds all threshold rules for an organization.
   */
  async findMany(organizationId: string): Promise<ThresholdRuleResponseDto[]> {
    const rules = await this.prisma.thresholdRule.findMany({
      where: { organizationId },
      orderBy: { priority: 'desc' },
    });
    return rules.map((r: ThresholdRule) => this.mapToResponse(r));
  }

  /**
   * Finds all active threshold rules for an organization.
   */
  async findActive(organizationId: string): Promise<ThresholdRuleResponseDto[]> {
    const rules = await this.prisma.thresholdRule.findMany({
      where: { organizationId, isActive: true },
      orderBy: { priority: 'desc' },
    });
    return rules.map((r: ThresholdRule) => this.mapToResponse(r));
  }

  /**
   * Deletes a threshold rule.
   */
  async delete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const rule = await this.findOneOrThrow(id, organizationId);

    await this.prisma.thresholdRule.delete({ where: { id } });

    await this.auditService.log({
      entityType: 'DISCLOSURE',
      entityId: id,
      action: 'threshold_rule_deleted',
      actionCategory: 'DELETE',
      actionDescription: `Deleted threshold rule "${rule.name}"`,
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
    });

    this.logger.log(`Deleted threshold rule ${id} in org ${organizationId}`);
  }

  // ===========================================
  // Rule Evaluation
  // ===========================================

  /**
   * Evaluates a disclosure against all applicable threshold rules.
   *
   * This is the main entry point for threshold checking. It:
   * 1. Loads all active rules for the disclosure type
   * 2. Evaluates each rule (including aggregate calculations)
   * 3. Logs trigger events for rules that fire
   * 4. Emits events for downstream processing (case creation, notifications)
   *
   * @param disclosureId - The RIU ID for the disclosure
   * @param organizationId - The organization ID
   * @param disclosureType - The type of disclosure (GIFT, COI, etc.)
   * @param disclosureData - The disclosure data for rule evaluation
   * @param personId - The person who made the disclosure
   * @returns Evaluation result with triggered rules and recommended action
   */
  async evaluateDisclosure(
    disclosureId: string,
    organizationId: string,
    disclosureType: string,
    disclosureData: Record<string, unknown>,
    personId: string,
  ): Promise<ThresholdEvaluationResult> {
    // Get all active rules for this disclosure type
    const rules = await this.prisma.thresholdRule.findMany({
      where: {
        organizationId,
        isActive: true,
        disclosureTypes: { has: disclosureType as DisclosureType },
      },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) {
      this.logger.debug(
        `No active threshold rules for disclosure type ${disclosureType} in org ${organizationId}`,
      );
      return { triggered: false, triggeredRules: [], recommendedAction: null };
    }

    const triggeredRules: TriggeredRule[] = [];
    let highestPriorityAction: ThresholdActionDto | null = null;

    // Action priority map (higher = more severe)
    const actionPriority: Record<string, number> = {
      CREATE_CASE: 4,
      REQUIRE_APPROVAL: 3,
      FLAG_REVIEW: 2,
      NOTIFY: 1,
    };

    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(
          rule,
          disclosureData,
          personId,
          organizationId,
        );

        if (result.triggered) {
          const triggeredRule: TriggeredRule = {
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action as ThresholdActionDto,
            evaluatedValue: result.evaluatedValue,
            thresholdValue: result.thresholdValue,
            aggregateBreakdown: result.aggregateBreakdown,
          };

          triggeredRules.push(triggeredRule);

          // Track highest priority action
          if (!highestPriorityAction) {
            highestPriorityAction = rule.action as ThresholdActionDto;
          } else if (
            actionPriority[rule.action] >
            actionPriority[highestPriorityAction]
          ) {
            highestPriorityAction = rule.action as ThresholdActionDto;
          }

          // Log the trigger
          await this.logTrigger(
            rule,
            disclosureId,
            personId,
            result,
            organizationId,
          );

          this.logger.log(
            `Threshold rule "${rule.name}" triggered for disclosure ${disclosureId} ` +
              `(evaluated: ${result.evaluatedValue}, threshold: ${result.thresholdValue})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating rule ${rule.id} "${rule.name}": ${error.message}`,
          error.stack,
        );
        // Continue with other rules even if one fails
      }
    }

    // Emit event if any rules triggered
    if (triggeredRules.length > 0) {
      this.eventEmitter.emit('threshold.triggered', {
        organizationId,
        disclosureId,
        personId,
        triggeredRules,
        recommendedAction: highestPriorityAction,
      });

      this.logger.log(
        `Threshold evaluation complete for disclosure ${disclosureId}: ` +
          `${triggeredRules.length} rule(s) triggered, recommended action: ${highestPriorityAction}`,
      );
    }

    return {
      triggered: triggeredRules.length > 0,
      triggeredRules,
      recommendedAction: highestPriorityAction,
    };
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  /**
   * Evaluates a single rule against disclosure data.
   */
  private async evaluateRule(
    rule: any,
    disclosureData: Record<string, unknown>,
    personId: string,
    organizationId: string,
  ): Promise<RuleEvaluationResult> {
    const conditions = rule.conditions as RuleConditionDto[];
    const aggregateConfig = rule.aggregateConfig as AggregateConfigDto | null;

    let evaluatedValue = 0;
    let aggregateBreakdown: AggregateBreakdown | undefined;

    // If aggregate config exists, calculate aggregate value first
    if (aggregateConfig) {
      const aggregateResult = await this.calculateAggregate(
        personId,
        organizationId,
        aggregateConfig,
        disclosureData,
      );
      evaluatedValue = aggregateResult.totalValue;
      aggregateBreakdown = aggregateResult;
    } else {
      // Use the disclosure value directly
      evaluatedValue = this.extractNumericValue(disclosureData, 'disclosureValue');
    }

    // Create json-rules-engine for condition evaluation
    const engine = new Engine();

    // Convert our conditions to json-rules-engine format
    const engineConditions = this.buildEngineConditions(conditions);

    // Add the main rule
    engine.addRule(
      new Rule({
        conditions: engineConditions,
        event: { type: 'threshold-met' },
      }),
    );

    // Build facts from disclosure data plus aggregate
    const facts = {
      ...this.flattenData(disclosureData),
      aggregateValue: evaluatedValue,
      disclosureValue: this.extractNumericValue(disclosureData, 'disclosureValue'),
    };

    const { events } = await engine.run(facts);

    // Find the threshold value from conditions (for logging)
    const thresholdCondition = conditions.find((c) =>
      ['gte', 'gt', 'lte', 'lt'].includes(c.operator),
    );
    const thresholdValue = (thresholdCondition?.value as number) || 0;

    return {
      triggered: events.length > 0,
      evaluatedValue,
      thresholdValue,
      aggregateBreakdown,
    };
  }

  /**
   * Calculates aggregate value across a time window (RS.38).
   *
   * Supports:
   * - Rolling windows (days, months, years)
   * - Calendar periods (year-to-date)
   * - Multiple dimensions (person, entity, category)
   * - Aggregate functions (SUM, COUNT, AVG, MAX)
   */
  private async calculateAggregate(
    personId: string,
    organizationId: string,
    config: AggregateConfigDto,
    currentDisclosure: Record<string, unknown>,
  ): Promise<AggregateBreakdown> {
    // Calculate time window
    const windowEnd = new Date();
    let windowStart = new Date();

    if (config.timeWindow) {
      const { period, value, type } = config.timeWindow;
      if (type === 'rolling') {
        switch (period) {
          case 'days':
            windowStart.setDate(windowStart.getDate() - value);
            break;
          case 'months':
            windowStart.setMonth(windowStart.getMonth() - value);
            break;
          case 'years':
            windowStart.setFullYear(windowStart.getFullYear() - value);
            break;
        }
      } else {
        // Calendar year (year-to-date)
        windowStart = new Date(windowEnd.getFullYear(), 0, 1);
      }
    } else {
      // Default: rolling 12 months
      windowStart.setFullYear(windowStart.getFullYear() - 1);
    }

    // Build where clause for aggregate query
    const whereClause: Prisma.RiuDisclosureExtensionWhereInput = {
      organizationId,
      createdAt: {
        gte: windowStart,
        lte: windowEnd,
      },
    };

    // Add dimension filters
    if (config.dimensions?.includes('person')) {
      whereClause.relatedPersonId = personId;
    }

    if (
      config.dimensions?.includes('entity') &&
      currentDisclosure.relatedCompany
    ) {
      whereClause.relatedCompany = {
        contains: currentDisclosure.relatedCompany as string,
        mode: 'insensitive',
      };
    }

    // Query related disclosures
    const relatedDisclosures = await this.prisma.riuDisclosureExtension.findMany(
      {
        where: whereClause,
        select: {
          riuId: true,
          disclosureValue: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    );

    // Calculate aggregate
    const func = config.aggregateFunction || 'SUM';
    const values: number[] = relatedDisclosures
      .map((d) => (d.disclosureValue ? Number(d.disclosureValue) : 0))
      .filter((v) => v > 0);

    // Add current disclosure value
    const currentValue = this.extractNumericValue(
      currentDisclosure,
      'disclosureValue',
    );
    values.push(currentValue);

    let totalValue = 0;
    switch (func) {
      case 'SUM':
        totalValue = values.reduce((sum: number, v: number) => sum + v, 0);
        break;
      case 'COUNT':
        totalValue = values.length;
        break;
      case 'AVG':
        totalValue =
          values.length > 0
            ? values.reduce((sum: number, v: number) => sum + v, 0) / values.length
            : 0;
        break;
      case 'MAX':
        totalValue = Math.max(...values, 0);
        break;
    }

    return {
      relatedDisclosures: relatedDisclosures.map((d) => ({
        id: d.riuId,
        date: d.createdAt,
        value: d.disclosureValue ? Number(d.disclosureValue) : 0,
      })),
      totalValue,
      windowStart,
      windowEnd,
    };
  }

  /**
   * Converts our condition DTOs to json-rules-engine format.
   */
  private buildEngineConditions(conditions: RuleConditionDto[]): any {
    if (conditions.length === 0) {
      return { all: [] };
    }

    // Convert to json-rules-engine format
    const engineConditions = conditions.map((c) => ({
      fact: c.field === 'disclosureValue' ? 'aggregateValue' : c.field,
      operator: this.mapOperator(c.operator as ConditionOperator),
      value: c.value,
    }));

    // Check for OR conjunction
    const hasOr = conditions.some((c) => c.conjunction === 'OR');
    if (hasOr) {
      return { any: engineConditions };
    }

    return { all: engineConditions };
  }

  /**
   * Maps our operator to json-rules-engine operator.
   */
  private mapOperator(op: ConditionOperator): string {
    const mapping: Record<string, string> = {
      eq: 'equal',
      neq: 'notEqual',
      gt: 'greaterThan',
      gte: 'greaterThanInclusive',
      lt: 'lessThan',
      lte: 'lessThanInclusive',
      contains: 'contains',
      in: 'in',
      not_in: 'notIn',
    };
    return mapping[op] || 'equal';
  }

  /**
   * Extracts a numeric value from a nested data path.
   */
  private extractNumericValue(
    data: Record<string, unknown>,
    path: string,
  ): number {
    const parts = path.split('.');
    let value: unknown = data;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return 0;
      }
    }
    return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  }

  /**
   * Flattens nested object for json-rules-engine facts.
   */
  private flattenData(
    data: Record<string, unknown>,
    prefix = '',
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(
          result,
          this.flattenData(value as Record<string, unknown>, newKey),
        );
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  /**
   * Logs a threshold trigger for audit and analytics.
   */
  private async logTrigger(
    rule: any,
    disclosureId: string,
    personId: string,
    result: RuleEvaluationResult,
    organizationId: string,
  ): Promise<void> {
    await this.prisma.thresholdTriggerLog.create({
      data: {
        organizationId,
        ruleId: rule.id,
        disclosureId,
        personId,
        evaluatedValue: new Decimal(result.evaluatedValue),
        thresholdValue: new Decimal(result.thresholdValue),
        aggregateBreakdown: result.aggregateBreakdown as unknown as Prisma.InputJsonValue,
        actionTaken: rule.action,
      },
    });
  }

  /**
   * Finds a threshold rule or throws NotFoundException.
   */
  private async findOneOrThrow(id: string, organizationId: string) {
    const rule = await this.prisma.thresholdRule.findFirst({
      where: { id, organizationId },
    });
    if (!rule) {
      throw new NotFoundException(`Threshold rule not found: ${id}`);
    }
    return rule;
  }

  /**
   * Maps a Prisma ThresholdRule to response DTO.
   */
  private mapToResponse(rule: any): ThresholdRuleResponseDto {
    return {
      id: rule.id,
      organizationId: rule.organizationId,
      name: rule.name,
      description: rule.description,
      disclosureTypes: rule.disclosureTypes,
      conditions: rule.conditions as RuleConditionDto[],
      aggregateConfig: rule.aggregateConfig as AggregateConfigDto | undefined,
      action: rule.action,
      actionConfig: rule.actionConfig as any,
      applyMode: rule.applyMode,
      priority: rule.priority,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}

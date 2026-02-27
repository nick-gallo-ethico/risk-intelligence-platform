import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  RuleDefinition,
  RuleExecutionLog,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import { CreateRuleDto, UpdateRuleDto } from "./dto";
import { RuleFilterOptions } from "./types/rule.types";

/**
 * RulesService provides CRUD operations for rule definitions.
 *
 * Key features:
 * - Tenant-isolated rule management
 * - Audit logging for all mutations
 * - Rule activation/deactivation
 * - Execution log querying
 */
@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new rule definition.
   *
   * @param dto - Rule creation data
   * @param userId - User creating the rule
   * @param organizationId - Organization ID (tenant)
   * @returns The created rule definition
   */
  async create(
    dto: CreateRuleDto,
    userId: string,
    organizationId: string,
  ): Promise<RuleDefinition> {
    // Check for duplicate name within organization
    const existing = await this.prisma.ruleDefinition.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Rule with name "${dto.name}" already exists`,
      );
    }

    const rule = await this.prisma.ruleDefinition.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 100,
        triggerEvent: dto.triggerEvent,
        conditions: dto.conditions as unknown as Prisma.InputJsonValue,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    // Log audit entry
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.RULE,
      entityId: rule.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created rule "${rule.name}" for ${rule.triggerEvent} events`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        ruleName: rule.name,
        triggerEvent: rule.triggerEvent,
        priority: rule.priority,
      },
    });

    this.logger.log(`Created rule ${rule.id}: ${rule.name}`);
    return rule;
  }

  /**
   * Find all rules for an organization with optional filters.
   *
   * @param organizationId - Organization ID (tenant)
   * @param options - Optional filters (triggerEvent, isActive)
   * @returns List of rule definitions
   */
  async findAll(
    organizationId: string,
    options?: RuleFilterOptions,
  ): Promise<RuleDefinition[]> {
    return this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        ...(options?.triggerEvent && { triggerEvent: options.triggerEvent }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    });
  }

  /**
   * Find a single rule by ID.
   *
   * @param id - Rule ID
   * @param organizationId - Organization ID (tenant)
   * @returns Rule definition or null if not found
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<RuleDefinition | null> {
    return this.prisma.ruleDefinition.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Update an existing rule.
   *
   * @param id - Rule ID
   * @param dto - Update data
   * @param userId - User making the update
   * @param organizationId - Organization ID (tenant)
   * @returns Updated rule definition
   */
  async update(
    id: string,
    dto: UpdateRuleDto,
    userId: string,
    organizationId: string,
  ): Promise<RuleDefinition> {
    const existing = await this.prisma.ruleDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    // Check for name conflict if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.ruleDefinition.findFirst({
        where: {
          organizationId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new ConflictException(
          `Rule with name "${dto.name}" already exists`,
        );
      }
    }

    const updated = await this.prisma.ruleDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        triggerEvent: dto.triggerEvent,
        conditions: dto.conditions
          ? (dto.conditions as unknown as Prisma.InputJsonValue)
          : undefined,
        actions: dto.actions
          ? (dto.actions as unknown as Prisma.InputJsonValue)
          : undefined,
        isActive: dto.isActive,
      },
    });

    // Build changes object for audit
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (dto.name && dto.name !== existing.name) {
      changes.name = { old: existing.name, new: dto.name };
    }
    if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
      changes.isActive = { old: existing.isActive, new: dto.isActive };
    }
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      changes.priority = { old: existing.priority, new: dto.priority };
    }

    // Log audit entry
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.RULE,
      entityId: id,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated rule "${updated.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes,
    });

    this.logger.log(`Updated rule ${id}`);
    return updated;
  }

  /**
   * Delete a rule.
   *
   * @param id - Rule ID
   * @param organizationId - Organization ID (tenant)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const existing = await this.prisma.ruleDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    // Check if rule has execution logs
    const logCount = await this.prisma.ruleExecutionLog.count({
      where: { ruleId: id },
    });

    if (logCount > 0) {
      // Soft delete by deactivating rather than hard delete
      // This preserves audit trail
      this.logger.warn(
        `Rule ${id} has ${logCount} execution logs, deactivating instead of deleting`,
      );
      await this.prisma.ruleDefinition.update({
        where: { id },
        data: { isActive: false },
      });
      return;
    }

    await this.prisma.ruleDefinition.delete({
      where: { id },
    });

    this.logger.log(`Deleted rule ${id}: ${existing.name}`);
  }

  /**
   * Activate a rule.
   *
   * @param id - Rule ID
   * @param organizationId - Organization ID (tenant)
   * @returns Updated rule definition
   */
  async activate(id: string, organizationId: string): Promise<RuleDefinition> {
    const existing = await this.prisma.ruleDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    if (existing.isActive) {
      return existing; // Already active
    }

    const updated = await this.prisma.ruleDefinition.update({
      where: { id },
      data: { isActive: true },
    });

    this.logger.log(`Activated rule ${id}: ${existing.name}`);
    return updated;
  }

  /**
   * Deactivate a rule.
   *
   * @param id - Rule ID
   * @param organizationId - Organization ID (tenant)
   * @returns Updated rule definition
   */
  async deactivate(
    id: string,
    organizationId: string,
  ): Promise<RuleDefinition> {
    const existing = await this.prisma.ruleDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    if (!existing.isActive) {
      return existing; // Already inactive
    }

    const updated = await this.prisma.ruleDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated rule ${id}: ${existing.name}`);
    return updated;
  }

  /**
   * Get execution logs for a rule.
   *
   * @param ruleId - Rule ID
   * @param organizationId - Organization ID (tenant)
   * @param limit - Maximum number of logs to return
   * @returns List of execution logs
   */
  async getExecutionLogs(
    ruleId: string,
    organizationId: string,
    limit = 50,
  ): Promise<RuleExecutionLog[]> {
    return this.prisma.ruleExecutionLog.findMany({
      where: {
        ruleId,
        organizationId,
      },
      orderBy: { executedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get all active rules for a specific trigger event.
   * Used by the rules engine during event processing.
   *
   * @param organizationId - Organization ID (tenant)
   * @param triggerEvent - Event type (e.g., "case.created")
   * @returns List of active rules ordered by priority
   */
  async findActiveByTrigger(
    organizationId: string,
    triggerEvent: string,
  ): Promise<RuleDefinition[]> {
    return this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        triggerEvent,
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });
  }

  /**
   * Log a rule execution result.
   * Called by the rules engine after evaluating a rule.
   *
   * @param data - Execution log data
   * @returns Created execution log
   */
  async logExecution(data: {
    organizationId: string;
    ruleId: string;
    entityType: string;
    entityId: string;
    facts: Record<string, unknown>;
    matched: boolean;
    actionsTaken?: Record<string, unknown>[];
    executionTimeMs: number;
    errorMessage?: string;
  }): Promise<RuleExecutionLog> {
    return this.prisma.ruleExecutionLog.create({
      data: {
        organizationId: data.organizationId,
        ruleId: data.ruleId,
        entityType: data.entityType,
        entityId: data.entityId,
        facts: data.facts as Prisma.InputJsonValue,
        matched: data.matched,
        actionsTaken: data.actionsTaken
          ? (data.actionsTaken as unknown as Prisma.InputJsonValue)
          : undefined,
        executionTimeMs: data.executionTimeMs,
        errorMessage: data.errorMessage,
      },
    });
  }
}

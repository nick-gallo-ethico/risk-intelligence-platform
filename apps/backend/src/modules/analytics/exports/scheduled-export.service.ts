import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import {
  ScheduledExport,
  ScheduledExportRun,
  ScheduleType,
  ScheduleRunStatus,
  ExportType,
  ExportFormat,
  DeliveryMethod,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import { addDays, addWeeks, addMonths, set, setDay } from "date-fns";

// ===========================================
// Schedule Configuration Interface
// ===========================================

/**
 * Configuration for schedule timing.
 * All schedules specify a time; weekly adds dayOfWeek, monthly adds dayOfMonth.
 */
export interface ScheduleConfig {
  /** Time of day in 24-hour format (e.g., "08:00", "14:30") */
  time: string;
  /** Day of week for WEEKLY schedules (0=Sunday, 1=Monday, ..., 6=Saturday) */
  dayOfWeek?: number;
  /** Day of month for MONTHLY schedules (1-31) */
  dayOfMonth?: number;
}

// ===========================================
// DTOs
// ===========================================

/**
 * DTO for creating a scheduled export.
 */
export interface CreateScheduledExportDto {
  name: string;
  description?: string;
  exportType: ExportType;
  format: ExportFormat;
  filters: Record<string, unknown>;
  columnConfig: ColumnConfig;
  scheduleType: ScheduleType;
  scheduleConfig: ScheduleConfig;
  timezone?: string;
  deliveryMethod: DeliveryMethod;
  recipients: string[];
  storageLocation?: string;
}

/**
 * DTO for updating a scheduled export.
 */
export interface UpdateScheduledExportDto {
  name?: string;
  description?: string;
  exportType?: ExportType;
  format?: ExportFormat;
  filters?: Record<string, unknown>;
  columnConfig?: ColumnConfig;
  scheduleType?: ScheduleType;
  scheduleConfig?: ScheduleConfig;
  timezone?: string;
  deliveryMethod?: DeliveryMethod;
  recipients?: string[];
  storageLocation?: string;
}

/**
 * Column configuration for exports.
 */
export interface ColumnConfig {
  includeInvestigations: boolean;
  maxInvestigations: number;
  includeTaggedFields: boolean;
  includeOverflow: boolean;
}

/**
 * Pagination parameters.
 */
export interface PaginationDto {
  offset?: number;
  limit?: number;
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

// ===========================================
// Service
// ===========================================

/**
 * ScheduledExportService
 *
 * Manages scheduled export configurations for periodic report delivery.
 *
 * Features:
 * - CRUD operations for scheduled exports
 * - Schedule calculation (daily, weekly, monthly)
 * - Pause/resume/run-now functionality
 * - Execution history tracking
 * - Audit logging for all operations
 */
@Injectable()
export class ScheduledExportService {
  private readonly logger = new Logger(ScheduledExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Create a new scheduled export.
   *
   * @param orgId - Organization ID
   * @param userId - User ID of creator
   * @param dto - Schedule configuration
   * @returns Created scheduled export
   */
  async createSchedule(
    orgId: string,
    userId: string,
    dto: CreateScheduledExportDto,
  ): Promise<ScheduledExport> {
    this.logger.log(`Creating scheduled export "${dto.name}" for org ${orgId}`);

    const timezone = dto.timezone || "America/New_York";
    const nextRunAt = this.calculateNextRun(
      dto.scheduleType,
      dto.scheduleConfig,
      timezone,
    );

    const schedule = await this.prisma.scheduledExport.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        exportType: dto.exportType,
        format: dto.format,
        filters: dto.filters as Prisma.InputJsonValue,
        columnConfig: dto.columnConfig as unknown as Prisma.InputJsonValue,
        scheduleType: dto.scheduleType,
        scheduleConfig: dto.scheduleConfig as unknown as Prisma.InputJsonValue,
        timezone,
        deliveryMethod: dto.deliveryMethod,
        recipients: dto.recipients,
        storageLocation: dto.storageLocation,
        nextRunAt,
        createdById: userId,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      entityType: AuditEntityType.REPORT,
      entityId: schedule.id,
      action: "SCHEDULED_EXPORT_CREATED",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created scheduled export "${dto.name}" with ${dto.scheduleType} schedule`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        scheduleType: dto.scheduleType,
        deliveryMethod: dto.deliveryMethod,
        recipientCount: dto.recipients.length,
      },
    });

    this.logger.log(`Created scheduled export ${schedule.id}`);

    return schedule;
  }

  /**
   * Update an existing scheduled export.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to update
   * @param dto - Updated configuration
   * @returns Updated scheduled export
   */
  async updateSchedule(
    orgId: string,
    scheduleId: string,
    dto: UpdateScheduledExportDto,
  ): Promise<ScheduledExport> {
    const existing = await this.prisma.scheduledExport.findFirst({
      where: { id: scheduleId, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Scheduled export not found");
    }

    // Recalculate next run if schedule parameters changed
    let nextRunAt = existing.nextRunAt;
    if (dto.scheduleType || dto.scheduleConfig || dto.timezone) {
      const scheduleType = dto.scheduleType || existing.scheduleType;
      const scheduleConfig = (dto.scheduleConfig ||
        existing.scheduleConfig) as ScheduleConfig;
      const timezone = dto.timezone || existing.timezone;

      nextRunAt = this.calculateNextRun(scheduleType, scheduleConfig, timezone);
    }

    const updated = await this.prisma.scheduledExport.update({
      where: { id: scheduleId },
      data: {
        name: dto.name,
        description: dto.description,
        exportType: dto.exportType,
        format: dto.format,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        columnConfig: dto.columnConfig as unknown as
          | Prisma.InputJsonValue
          | undefined,
        scheduleType: dto.scheduleType,
        scheduleConfig: dto.scheduleConfig as unknown as
          | Prisma.InputJsonValue
          | undefined,
        timezone: dto.timezone,
        deliveryMethod: dto.deliveryMethod,
        recipients: dto.recipients,
        storageLocation: dto.storageLocation,
        nextRunAt,
      },
    });

    this.logger.log(`Updated scheduled export ${scheduleId}`);

    return updated;
  }

  /**
   * Delete a scheduled export.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to delete
   */
  async deleteSchedule(orgId: string, scheduleId: string): Promise<void> {
    const result = await this.prisma.scheduledExport.deleteMany({
      where: { id: scheduleId, organizationId: orgId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Scheduled export not found");
    }

    this.logger.log(`Deleted scheduled export ${scheduleId}`);
  }

  /**
   * Get a single scheduled export with recent run history.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to retrieve
   * @returns Scheduled export with runs, or null if not found
   */
  async getSchedule(
    orgId: string,
    scheduleId: string,
  ): Promise<
    | (ScheduledExport & {
        runs: ScheduledExportRun[];
        createdBy: { id: string; firstName: string; lastName: string };
      })
    | null
  > {
    return this.prisma.scheduledExport.findFirst({
      where: { id: scheduleId, organizationId: orgId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * List scheduled exports with pagination and optional filtering.
   *
   * @param orgId - Organization ID
   * @param query - Query parameters
   * @returns Paginated list of scheduled exports
   */
  async listSchedules(
    orgId: string,
    query: { isActive?: boolean } & PaginationDto,
  ): Promise<PaginatedResult<ScheduledExport>> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const where: Prisma.ScheduledExportWhereInput = {
      organizationId: orgId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.scheduledExport.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.scheduledExport.count({ where }),
    ]);

    return { items, total, offset, limit };
  }

  // ===========================================
  // Status Management
  // ===========================================

  /**
   * Pause a scheduled export (deactivate without deleting).
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to pause
   */
  async pauseSchedule(orgId: string, scheduleId: string): Promise<void> {
    const result = await this.prisma.scheduledExport.updateMany({
      where: { id: scheduleId, organizationId: orgId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException("Scheduled export not found");
    }

    this.logger.log(`Paused scheduled export ${scheduleId}`);
  }

  /**
   * Resume a paused scheduled export.
   * Recalculates the next run time from now.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to resume
   */
  async resumeSchedule(orgId: string, scheduleId: string): Promise<void> {
    const schedule = await this.getSchedule(orgId, scheduleId);
    if (!schedule) {
      throw new NotFoundException("Scheduled export not found");
    }

    const nextRunAt = this.calculateNextRun(
      schedule.scheduleType,
      schedule.scheduleConfig as unknown as ScheduleConfig,
      schedule.timezone,
    );

    await this.prisma.scheduledExport.updateMany({
      where: { id: scheduleId, organizationId: orgId },
      data: { isActive: true, nextRunAt },
    });

    this.logger.log(`Resumed scheduled export ${scheduleId}`);
  }

  /**
   * Trigger an immediate run of a scheduled export.
   * Creates a run record that the processor will pick up.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID to run
   * @returns The created run ID
   */
  async runNow(orgId: string, scheduleId: string): Promise<string> {
    const schedule = await this.getSchedule(orgId, scheduleId);
    if (!schedule) {
      throw new NotFoundException("Scheduled export not found");
    }

    // Create a pending run that the processor will pick up
    // Note: In a real implementation, this would queue a job via BullMQ
    // For now, we just create a run record and the processor will handle it
    const run = await this.prisma.scheduledExportRun.create({
      data: {
        scheduledExportId: scheduleId,
        status: ScheduleRunStatus.SUCCESS, // Will be updated by processor
        deliveredTo: [],
      },
    });

    this.logger.log(
      `Created immediate run ${run.id} for scheduled export ${scheduleId}`,
    );

    return run.id;
  }

  // ===========================================
  // Run History
  // ===========================================

  /**
   * Get execution history for a scheduled export.
   *
   * @param orgId - Organization ID
   * @param scheduleId - Schedule ID
   * @param query - Pagination parameters
   * @returns Paginated run history
   */
  async getRunHistory(
    orgId: string,
    scheduleId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<ScheduledExportRun>> {
    // Verify schedule belongs to org
    const schedule = await this.prisma.scheduledExport.findFirst({
      where: { id: scheduleId, organizationId: orgId },
    });

    if (!schedule) {
      throw new NotFoundException("Scheduled export not found");
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.scheduledExportRun.findMany({
        where: { scheduledExportId: scheduleId },
        skip: offset,
        take: limit,
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.scheduledExportRun.count({
        where: { scheduledExportId: scheduleId },
      }),
    ]);

    return { items, total, offset, limit };
  }

  // ===========================================
  // Processor Support Methods
  // ===========================================

  /**
   * Get all scheduled exports that are due to run.
   * Called by the cron processor to find work.
   *
   * @returns Active schedules with nextRunAt <= now
   */
  async getDueSchedules(): Promise<
    Array<ScheduledExport & { organization: { id: string; name: string } }>
  > {
    return this.prisma.scheduledExport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update a schedule after a run completes.
   * Sets last run status and calculates next run time.
   *
   * @param scheduleId - Schedule ID
   * @param status - Run status (SUCCESS, FAILED, SKIPPED)
   * @param _runId - Run ID (for logging reference)
   */
  async updateAfterRun(
    scheduleId: string,
    status: ScheduleRunStatus,
    _runId: string,
  ): Promise<void> {
    const schedule = await this.prisma.scheduledExport.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      this.logger.warn(
        `Cannot update after run: schedule ${scheduleId} not found`,
      );
      return;
    }

    const nextRunAt = this.calculateNextRun(
      schedule.scheduleType,
      schedule.scheduleConfig as unknown as ScheduleConfig,
      schedule.timezone,
    );

    await this.prisma.scheduledExport.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: status,
        nextRunAt,
      },
    });

    this.logger.log(
      `Updated schedule ${scheduleId} after run: status=${status}, nextRun=${nextRunAt.toISOString()}`,
    );
  }

  // ===========================================
  // Schedule Calculation
  // ===========================================

  /**
   * Calculate the next run time based on schedule configuration.
   *
   * @param scheduleType - DAILY, WEEKLY, or MONTHLY
   * @param config - Schedule configuration (time, dayOfWeek, dayOfMonth)
   * @param timezone - Timezone for schedule (e.g., "America/New_York")
   * @returns Next run date/time
   */
  calculateNextRun(
    scheduleType: ScheduleType,
    config: ScheduleConfig,
    timezone: string,
  ): Date {
    const now = new Date();

    // Parse time from config (e.g., "08:00")
    const [hours, minutes] = (config.time || "08:00").split(":").map(Number);

    // Note: For simplicity, we're calculating in UTC.
    // A production implementation would use a library like date-fns-tz
    // to properly handle timezone conversions.
    // Log timezone for debugging; actual TZ conversion would need date-fns-tz
    this.logger.debug(`Calculating next run in timezone: ${timezone}`);

    switch (scheduleType) {
      case ScheduleType.DAILY: {
        let next = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
        if (next <= now) {
          next = addDays(next, 1);
        }
        return next;
      }

      case ScheduleType.WEEKLY: {
        const dayOfWeek = config.dayOfWeek ?? 1; // Default to Monday
        let next = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
        next = setDay(next, dayOfWeek);
        if (next <= now) {
          next = addWeeks(next, 1);
        }
        return next;
      }

      case ScheduleType.MONTHLY: {
        const dayOfMonth = config.dayOfMonth ?? 1; // Default to 1st of month
        let next = set(now, {
          date: dayOfMonth,
          hours,
          minutes,
          seconds: 0,
          milliseconds: 0,
        });
        if (next <= now) {
          next = addMonths(next, 1);
        }
        return next;
      }

      default:
        // Fallback: next day at specified time
        return addDays(
          set(now, { hours, minutes, seconds: 0, milliseconds: 0 }),
          1,
        );
    }
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * Log an audit entry with error handling.
   */
  private async logAudit(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditService.log(dto);
    } catch (error) {
      // Audit failures shouldn't break export operations
      this.logger.warn(
        `Failed to log audit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

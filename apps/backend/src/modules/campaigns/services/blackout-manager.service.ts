import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { OrgBlackoutDate, AuditEntityType, AuditActionCategory, ActorType } from "@prisma/client";

/**
 * Blackout date input for creating or updating blackout periods.
 */
export interface BlackoutDateInput {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  affectsLocations?: string[];
  isRecurring?: boolean;
  recurringPattern?: "YEARLY" | "QUARTERLY" | "MONTHLY";
}

/**
 * BlackoutManagerService
 *
 * Manages organization blackout dates for campaign scheduling:
 * - Check if dates fall within blackout periods
 * - Find next available date after blackouts
 * - CRUD operations for blackout dates
 * - Handle recurring blackout patterns
 */
@Injectable()
export class BlackoutManagerService {
  private readonly logger = new Logger(BlackoutManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Check if a date falls within any active blackout period.
   */
  async checkBlackouts(date: Date, organizationId: string, locationId?: string): Promise<boolean> {
    const blackouts = await this.getActiveBlackouts(organizationId);

    for (const blackout of blackouts) {
      if (this.isDateInBlackout(date, blackout, locationId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the next available date that's not in a blackout period.
   */
  async getNextAvailableDate(fromDate: Date, organizationId: string, locationId?: string): Promise<Date> {
    const blackouts = await this.getActiveBlackouts(organizationId);
    let currentDate = new Date(fromDate);
    let attempts = 0;
    const maxAttempts = 365;

    while (attempts < maxAttempts) {
      let inBlackout = false;

      for (const blackout of blackouts) {
        if (this.isDateInBlackout(currentDate, blackout, locationId)) {
          inBlackout = true;
          currentDate = new Date(blackout.endDate);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        }
      }

      if (!inBlackout) return currentDate;
      attempts++;
    }

    this.logger.warn(`Could not find available date after ${maxAttempts} attempts for org ${organizationId}`);
    return fromDate;
  }

  /**
   * Check if a specific date falls within a blackout (handles recurring).
   */
  isDateInBlackout(date: Date, blackout: OrgBlackoutDate, locationId?: string): boolean {
    // Check location scope
    if (blackout.affectsLocations.length > 0 && locationId && !blackout.affectsLocations.includes(locationId)) {
      return false;
    }

    // For non-recurring blackouts, simple date range check
    if (!blackout.isRecurring) {
      return date >= blackout.startDate && date <= blackout.endDate;
    }

    // For recurring blackouts, check if the date falls within the recurring pattern
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    const startMonth = blackout.startDate.getMonth();
    const startDay = blackout.startDate.getDate();
    const endMonth = blackout.endDate.getMonth();
    const endDay = blackout.endDate.getDate();

    switch (blackout.recurringPattern) {
      case "YEARLY":
        if (startMonth === endMonth) {
          return dateMonth === startMonth && dateDay >= startDay && dateDay <= endDay;
        } else if (startMonth < endMonth) {
          return (
            (dateMonth === startMonth && dateDay >= startDay) ||
            (dateMonth > startMonth && dateMonth < endMonth) ||
            (dateMonth === endMonth && dateDay <= endDay)
          );
        } else {
          // Crosses year boundary (e.g., Dec 15 - Jan 5)
          return (
            (dateMonth === startMonth && dateDay >= startDay) ||
            dateMonth > startMonth ||
            dateMonth < endMonth ||
            (dateMonth === endMonth && dateDay <= endDay)
          );
        }

      case "QUARTERLY":
        const quarterOffset = date.getMonth() % 3;
        const startOffset = blackout.startDate.getMonth() % 3;
        const endOffset = blackout.endDate.getMonth() % 3;
        if (quarterOffset === startOffset && dateDay >= startDay) return true;
        if (quarterOffset === endOffset && dateDay <= endDay) return true;
        if (quarterOffset > startOffset && quarterOffset < endOffset) return true;
        return false;

      case "MONTHLY":
        return dateDay >= startDay && dateDay <= endDay;

      default:
        return false;
    }
  }

  /**
   * Get all active blackouts for an organization.
   */
  async getActiveBlackouts(organizationId: string): Promise<OrgBlackoutDate[]> {
    return this.prisma.orgBlackoutDate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { startDate: "asc" },
    });
  }

  /**
   * Create a new blackout date.
   */
  async createBlackout(input: BlackoutDateInput, userId: string, organizationId: string): Promise<OrgBlackoutDate> {
    if (input.startDate >= input.endDate) {
      throw new BadRequestException("Start date must be before end date");
    }

    const blackout = await this.prisma.orgBlackoutDate.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        affectsLocations: input.affectsLocations ?? [],
        isRecurring: input.isRecurring ?? false,
        recurringPattern: input.recurringPattern,
        createdById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: "ORGANIZATION" as AuditEntityType,
      entityId: organizationId,
      action: "blackout_created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created blackout period "${input.name}" from ${input.startDate.toISOString()} to ${input.endDate.toISOString()}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Created blackout ${blackout.id} for org ${organizationId}`);
    return blackout;
  }

  /**
   * Update an existing blackout date.
   */
  async updateBlackout(blackoutId: string, input: Partial<BlackoutDateInput>, userId: string, organizationId: string): Promise<OrgBlackoutDate> {
    const existing = await this.prisma.orgBlackoutDate.findFirst({ where: { id: blackoutId, organizationId } });
    if (!existing) throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);

    if (input.startDate && input.endDate && input.startDate >= input.endDate) {
      throw new BadRequestException("Start date must be before end date");
    }

    const updated = await this.prisma.orgBlackoutDate.update({
      where: { id: blackoutId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.endDate !== undefined && { endDate: input.endDate }),
        ...(input.affectsLocations !== undefined && { affectsLocations: input.affectsLocations }),
        ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
        ...(input.recurringPattern !== undefined && { recurringPattern: input.recurringPattern }),
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: "ORGANIZATION" as AuditEntityType,
      entityId: organizationId,
      action: "blackout_updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated blackout period "${updated.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Delete (soft-delete) a blackout date.
   */
  async deleteBlackout(blackoutId: string, userId: string, organizationId: string): Promise<void> {
    const existing = await this.prisma.orgBlackoutDate.findFirst({ where: { id: blackoutId, organizationId } });
    if (!existing) throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);

    await this.prisma.orgBlackoutDate.update({
      where: { id: blackoutId },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      entityType: "ORGANIZATION" as AuditEntityType,
      entityId: organizationId,
      action: "blackout_deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Deleted blackout period "${existing.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Soft-deleted blackout ${blackoutId} for org ${organizationId}`);
  }

  /**
   * List all blackout dates for an organization.
   */
  async listBlackouts(organizationId: string, options?: { includeInactive?: boolean }): Promise<OrgBlackoutDate[]> {
    return this.prisma.orgBlackoutDate.findMany({
      where: {
        organizationId,
        ...(options?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { startDate: "asc" },
    });
  }

  /**
   * Get a single blackout by ID.
   */
  async getBlackout(blackoutId: string, organizationId: string): Promise<OrgBlackoutDate> {
    const blackout = await this.prisma.orgBlackoutDate.findFirst({ where: { id: blackoutId, organizationId } });
    if (!blackout) throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    return blackout;
  }
}

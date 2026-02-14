/**
 * ReportScheduleService - Business logic for report schedule management
 *
 * Handles:
 * - Creating scheduled exports for reports
 * - Updating schedule configurations
 * - Format mapping between frontend and backend enums
 * - Schedule lifecycle (pause, resume, run now)
 *
 * Extracted from ReportController to maintain thin controller pattern.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  ScheduledExportService,
  CreateScheduledExportDto,
  UpdateScheduledExportDto,
} from "../../exports/scheduled-export.service";
import { ExportType, ExportFormat, DeliveryMethod } from "@prisma/client";

/**
 * Schedule configuration input from frontend
 */
export interface CreateScheduleInput {
  name: string;
  scheduleType: "DAILY" | "WEEKLY" | "MONTHLY";
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone?: string;
  format: "EXCEL" | "CSV" | "PDF";
  recipients: string[];
}

/**
 * Schedule configuration update input
 */
export interface UpdateScheduleInput {
  name?: string;
  scheduleType?: "DAILY" | "WEEKLY" | "MONTHLY";
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone?: string;
  format?: "EXCEL" | "CSV" | "PDF";
  recipients?: string[];
}

/**
 * Schedule response format for frontend
 */
export interface ScheduleResponse {
  id: string;
  name: string;
  scheduleType: string;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  format: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: Date | null;
  lastRunStatus?: string | null;
  nextRunAt?: Date | null;
}

/**
 * Report access verification result
 */
export interface ReportAccess {
  id: string;
  scheduledExportId: string | null;
  name: string;
}

@Injectable()
export class ReportScheduleService {
  /** Map frontend format to ExportFormat enum */
  private readonly formatMap: Record<string, ExportFormat> = {
    EXCEL: ExportFormat.XLSX,
    CSV: ExportFormat.CSV,
    PDF: ExportFormat.PDF,
  };

  /** Map ExportFormat enum back to frontend format */
  private readonly formatReverseMap: Record<string, string> = {
    XLSX: "EXCEL",
    CSV: "CSV",
    PDF: "PDF",
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduledExportService: ScheduledExportService,
  ) {}

  /**
   * Verify report exists and belongs to organization.
   * Returns report with scheduledExportId for schedule operations.
   */
  async verifyReportAccess(
    reportId: string,
    organizationId: string,
  ): Promise<ReportAccess> {
    const report = await this.prisma.savedReport.findFirst({
      where: { id: reportId, organizationId },
      select: { id: true, scheduledExportId: true, name: true },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }

  /**
   * Create a schedule for a report.
   */
  async createSchedule(
    reportId: string,
    input: CreateScheduleInput,
    userId: string,
    organizationId: string,
  ): Promise<ScheduleResponse> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    // Check if report already has a schedule
    if (report.scheduledExportId) {
      throw new NotFoundException(
        "Report already has a schedule. Use PUT to update or DELETE to remove.",
      );
    }

    // Create the scheduled export
    const scheduleDto: CreateScheduledExportDto = {
      name: input.name,
      description: `Scheduled delivery for report: ${report.name}`,
      exportType: ExportType.CUSTOM,
      format: this.formatMap[input.format] || ExportFormat.XLSX,
      filters: { reportId },
      columnConfig: {
        includeInvestigations: false,
        maxInvestigations: 0,
        includeTaggedFields: false,
        includeOverflow: false,
      },
      scheduleType: input.scheduleType,
      scheduleConfig: {
        time: input.time,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
      },
      timezone: input.timezone || "America/New_York",
      deliveryMethod: DeliveryMethod.EMAIL,
      recipients: input.recipients,
    };

    const schedule = await this.scheduledExportService.createSchedule(
      organizationId,
      userId,
      scheduleDto,
    );

    // Link schedule to report
    await this.prisma.savedReport.update({
      where: { id: reportId },
      data: { scheduledExportId: schedule.id },
    });

    return this.transformToResponse(schedule, input.format);
  }

  /**
   * Get the schedule for a report.
   */
  async getSchedule(
    reportId: string,
    organizationId: string,
  ): Promise<ScheduleResponse> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    const schedule = await this.scheduledExportService.getSchedule(
      organizationId,
      report.scheduledExportId,
    );

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    return this.transformToFullResponse(schedule);
  }

  /**
   * Update an existing schedule.
   */
  async updateSchedule(
    reportId: string,
    input: UpdateScheduleInput,
    organizationId: string,
  ): Promise<ScheduleResponse> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    const updateDto: UpdateScheduledExportDto = {};

    if (input.name !== undefined) updateDto.name = input.name;
    if (input.format !== undefined)
      updateDto.format = this.formatMap[input.format];
    if (input.recipients !== undefined) updateDto.recipients = input.recipients;
    if (input.timezone !== undefined) updateDto.timezone = input.timezone;
    if (input.scheduleType !== undefined)
      updateDto.scheduleType = input.scheduleType;

    // Build schedule config if any timing params provided
    if (
      input.time !== undefined ||
      input.dayOfWeek !== undefined ||
      input.dayOfMonth !== undefined
    ) {
      updateDto.scheduleConfig = {
        time: input.time || "08:00",
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
      };
    }

    const schedule = await this.scheduledExportService.updateSchedule(
      organizationId,
      report.scheduledExportId,
      updateDto,
    );

    return this.transformToFullResponse(schedule);
  }

  /**
   * Delete a schedule from a report.
   */
  async deleteSchedule(
    reportId: string,
    organizationId: string,
  ): Promise<void> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    // Delete the scheduled export
    await this.scheduledExportService.deleteSchedule(
      organizationId,
      report.scheduledExportId,
    );

    // Remove link from report
    await this.prisma.savedReport.update({
      where: { id: reportId },
      data: { scheduledExportId: null },
    });
  }

  /**
   * Pause a schedule.
   */
  async pauseSchedule(
    reportId: string,
    organizationId: string,
  ): Promise<{ message: string; isActive: boolean }> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    await this.scheduledExportService.pauseSchedule(
      organizationId,
      report.scheduledExportId,
    );

    return { message: "Schedule paused", isActive: false };
  }

  /**
   * Resume a paused schedule.
   */
  async resumeSchedule(
    reportId: string,
    organizationId: string,
  ): Promise<{ message: string; isActive: boolean }> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    await this.scheduledExportService.resumeSchedule(
      organizationId,
      report.scheduledExportId,
    );

    return { message: "Schedule resumed", isActive: true };
  }

  /**
   * Trigger immediate execution of a scheduled report.
   */
  async runScheduleNow(
    reportId: string,
    organizationId: string,
  ): Promise<{ message: string; runId: string }> {
    const report = await this.verifyReportAccess(reportId, organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    const runId = await this.scheduledExportService.runNow(
      organizationId,
      report.scheduledExportId,
    );

    return { message: "Report queued for immediate delivery", runId };
  }

  /**
   * Transform schedule to basic response format.
   */
  private transformToResponse(
    schedule: {
      id: string;
      name: string;
      scheduleType: string;
      scheduleConfig: unknown;
      timezone: string;
      isActive: boolean;
      recipients: string[];
    },
    format: string,
  ): ScheduleResponse {
    const config = schedule.scheduleConfig as {
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    };
    return {
      id: schedule.id,
      name: schedule.name,
      scheduleType: schedule.scheduleType,
      time: config?.time || "08:00",
      dayOfWeek: config?.dayOfWeek,
      dayOfMonth: config?.dayOfMonth,
      timezone: schedule.timezone,
      format: format,
      recipients: schedule.recipients,
      isActive: schedule.isActive,
    };
  }

  /**
   * Transform schedule to full response format with status info.
   */
  private transformToFullResponse(schedule: {
    id: string;
    name: string;
    scheduleType: string;
    scheduleConfig: unknown;
    timezone: string;
    format: string;
    isActive: boolean;
    recipients: string[];
    lastRunAt?: Date | null;
    lastRunStatus?: string | null;
    nextRunAt?: Date | null;
  }): ScheduleResponse {
    const config = schedule.scheduleConfig as {
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    };
    return {
      id: schedule.id,
      name: schedule.name,
      scheduleType: schedule.scheduleType,
      time: config?.time || "08:00",
      dayOfWeek: config?.dayOfWeek,
      dayOfMonth: config?.dayOfMonth,
      timezone: schedule.timezone,
      format: this.formatReverseMap[schedule.format] || "EXCEL",
      recipients: schedule.recipients,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt,
      lastRunStatus: schedule.lastRunStatus,
      nextRunAt: schedule.nextRunAt,
    };
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { SlaConfigService } from "./sla-config.service";
import {
  CaseSlaConfig,
  CaseSlaState,
  SlaCalculation,
  SlaCheckResult,
  DEFAULT_CASE_SLA_CONFIG,
} from "./sla.types";
import {
  SlaWarningEvent,
  SlaBreachedEvent,
  SlaCriticalEvent,
} from "../../events/events/sla.events";
import { Prisma } from "@prisma/client";

/**
 * CaseSlaTrackerService monitors case-level SLA compliance.
 *
 * Responsibilities:
 * - Check all active cases across all organizations for SLA status
 * - Calculate SLA status based on org-level configuration
 * - Emit sla.warning events when cases reach 80% threshold
 * - Emit sla.breached events when cases exceed due date
 * - Emit sla.critical events when cases are 48+ hours past due
 * - Track SLA state to prevent duplicate notifications
 *
 * SLA Status Levels:
 * - on_track: Less than 80% of time used
 * - warning: 80%+ of time used (triggers notification)
 * - breached: Past due date
 * - critical: 48+ hours past due
 *
 * Deduplication:
 * - Uses Case.slaState to track lastStatus and lastNotifiedAt
 * - Only emits warning events on status transitions (on_track -> warning)
 */
@Injectable()
export class CaseSlaTrackerService {
  private readonly logger = new Logger(CaseSlaTrackerService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private slaConfigService: SlaConfigService,
  ) {}

  /**
   * Check SLA status for all active cases across all organizations.
   * Batches by organization for efficient config loading.
   *
   * Called by SlaSchedulerService every 5 minutes.
   *
   * @returns Summary of the check run
   */
  async checkAllCaseSlas(): Promise<SlaCheckResult> {
    // Get all orgs with SLA enabled
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, caseSlaConfig: true },
    });

    let totalChecked = 0;
    let warnings = 0;
    let breaches = 0;
    let criticals = 0;

    for (const org of orgs) {
      const config = this.parseConfig(org.caseSlaConfig);

      // Skip if SLA monitoring disabled for this org
      if (!config.enabled) continue;

      const result = await this.checkOrgCases(org.id, config);
      totalChecked += result.checked;
      warnings += result.warnings;
      breaches += result.breaches;
      criticals += result.criticals ?? 0;
    }

    return { checked: totalChecked, warnings, breaches, criticals };
  }

  /**
   * Check cases for a single organization.
   *
   * @param organizationId - The organization to check
   * @param config - The org's SLA configuration
   * @returns Summary of the check run for this org
   */
  private async checkOrgCases(
    organizationId: string,
    config: CaseSlaConfig,
  ): Promise<SlaCheckResult> {
    // Find open cases (exclude CLOSED and merged cases)
    const cases = await this.prisma.case.findMany({
      where: {
        organizationId,
        status: { not: "CLOSED" },
        isMerged: false,
      },
      select: {
        id: true,
        referenceNumber: true,
        severity: true,
        primaryCategoryId: true,
        createdAt: true,
        slaState: true,
        slaDueDate: true,
        investigations: {
          where: { status: { not: "CLOSED" } },
          select: { primaryInvestigatorId: true },
          take: 1,
        },
      },
    });

    let warnings = 0;
    let breaches = 0;
    let criticals = 0;

    for (const caseRecord of cases) {
      try {
        // Calculate or use existing due date
        const dueDate = caseRecord.slaDueDate
          ? new Date(caseRecord.slaDueDate)
          : this.slaConfigService.calculateDueDate(
              config,
              caseRecord.severity || "MEDIUM",
              caseRecord.primaryCategoryId || undefined,
              caseRecord.createdAt,
            );

        const calc = this.calculateSlaStatus(
          dueDate,
          caseRecord.createdAt,
          config,
        );
        const currentState =
          caseRecord.slaState as unknown as CaseSlaState | null;

        // Get assignee from first open investigation
        const assigneeId = caseRecord.investigations[0]?.primaryInvestigatorId;

        // Check for warning transition
        if (this.shouldEmitWarning(currentState, calc)) {
          if (assigneeId) {
            this.emitWarningEvent(
              organizationId,
              caseRecord,
              assigneeId,
              calc,
              dueDate,
            );
            warnings++;
          }
        }

        // Check for breach transition (on_track/warning -> breached)
        if (this.shouldEmitBreach(currentState, calc)) {
          if (assigneeId) {
            const supervisor = await this.findSupervisor(
              organizationId,
              assigneeId,
            );
            this.emitBreachEvent(
              organizationId,
              caseRecord,
              assigneeId,
              supervisor?.id,
              calc,
            );
            breaches++;
          }
        }

        // Check for critical transition (any -> critical)
        if (this.shouldEmitCritical(currentState, calc)) {
          if (assigneeId) {
            const supervisor = await this.findSupervisor(
              organizationId,
              assigneeId,
            );
            const cco = await this.findComplianceOfficer(organizationId);
            if (cco) {
              this.emitCriticalEvent(
                organizationId,
                caseRecord,
                assigneeId,
                supervisor?.id,
                cco.id,
                calc,
              );
              criticals++;
            }
          }
        }

        // Update case SLA state if changed
        if (this.hasStatusChanged(currentState, calc.status)) {
          await this.updateCaseSlaState(caseRecord.id, calc, dueDate);
        }
      } catch (error) {
        this.logger.error(
          `Failed to check SLA for case ${caseRecord.id}: ${error instanceof Error ? error.message : "Unknown"}`,
        );
      }
    }

    return { checked: cases.length, warnings, breaches, criticals };
  }

  /**
   * Calculate SLA status for a case.
   *
   * @param dueDate - When the SLA is due
   * @param startDate - When the case was created
   * @param config - The organization's SLA configuration
   * @returns SLA calculation result
   */
  calculateSlaStatus(
    dueDate: Date,
    startDate: Date,
    config: CaseSlaConfig,
  ): SlaCalculation {
    const now = new Date();
    const remainingMs = dueDate.getTime() - now.getTime();
    const remainingHours = remainingMs / (1000 * 60 * 60);

    const totalDays = config.defaultDays;
    const totalMs = totalDays * 24 * 60 * 60 * 1000;
    const elapsedMs = now.getTime() - startDate.getTime();
    const percentUsed = Math.min(200, Math.max(0, (elapsedMs / totalMs) * 100));

    let status: SlaCalculation["status"];
    if (remainingHours <= -config.criticalThresholdHours) {
      status = "critical";
    } else if (remainingHours <= 0) {
      status = "breached";
    } else if (percentUsed >= config.warningThresholdPercent) {
      status = "warning";
    } else {
      status = "on_track";
    }

    return {
      status,
      dueDate,
      remainingHours,
      percentUsed,
      breachedAt: remainingHours <= 0 ? now : undefined,
    };
  }

  /**
   * Determine if warning event should be emitted.
   * Only emit on TRANSITION from on_track to warning.
   *
   * @param currentState - The case's current SLA state
   * @param calc - The new SLA calculation
   * @returns true if warning event should be emitted
   */
  private shouldEmitWarning(
    currentState: CaseSlaState | null,
    calc: SlaCalculation,
  ): boolean {
    if (calc.status !== "warning") return false;
    if (!currentState) return true; // First check, emit warning
    return currentState.lastStatus === "on_track"; // Transition from on_track
  }

  /**
   * Determine if breach event should be emitted.
   * Only emit on TRANSITION from warning/on_track to breached.
   * Note: Critical is a separate event, not a breach.
   *
   * @param currentState - The case's current SLA state
   * @param calc - The new SLA calculation
   * @returns true if breach event should be emitted
   */
  private shouldEmitBreach(
    currentState: CaseSlaState | null,
    calc: SlaCalculation,
  ): boolean {
    // Only emit for breached status (not critical - that's separate)
    if (calc.status !== "breached") return false;
    if (!currentState) return true; // First check while breached
    // Only emit on transition TO breached (not if already breached/critical)
    return (
      currentState.lastStatus === "on_track" ||
      currentState.lastStatus === "warning"
    );
  }

  /**
   * Determine if critical event should be emitted.
   * Only emit on TRANSITION to critical from any other status.
   *
   * @param currentState - The case's current SLA state
   * @param calc - The new SLA calculation
   * @returns true if critical event should be emitted
   */
  private shouldEmitCritical(
    currentState: CaseSlaState | null,
    calc: SlaCalculation,
  ): boolean {
    if (calc.status !== "critical") return false;
    if (!currentState) return true; // First check while critical
    return currentState.lastStatus !== "critical"; // Any transition TO critical
  }

  /**
   * Check if SLA status has changed from current state.
   *
   * @param currentState - The case's current SLA state
   * @param newStatus - The newly calculated status
   * @returns true if status changed
   */
  private hasStatusChanged(
    currentState: CaseSlaState | null,
    newStatus: SlaCalculation["status"],
  ): boolean {
    if (!currentState) return true;
    return currentState.lastStatus !== newStatus;
  }

  /**
   * Update the case's SLA state in the database.
   *
   * @param caseId - The case ID
   * @param calc - The SLA calculation result
   * @param dueDate - The SLA due date
   */
  private async updateCaseSlaState(
    caseId: string,
    calc: SlaCalculation,
    dueDate: Date,
  ): Promise<void> {
    const newState: CaseSlaState = {
      lastStatus: calc.status,
      lastNotifiedAt: calc.status !== "on_track" ? new Date() : null,
      lastNotificationType:
        calc.status === "on_track"
          ? null
          : (calc.status as "warning" | "breach" | "critical"),
    };

    await this.prisma.case.update({
      where: { id: caseId },
      data: {
        slaState: newState as unknown as Prisma.InputJsonValue,
        slaDueDate: dueDate,
      },
    });
  }

  /**
   * Emit SLA warning event for notification handling.
   *
   * @param organizationId - The organization ID
   * @param caseRecord - The case data
   * @param assigneeId - The current assignee's user ID
   * @param calc - The SLA calculation result
   * @param dueDate - The SLA due date
   */
  private emitWarningEvent(
    organizationId: string,
    caseRecord: { id: string; referenceNumber: string },
    assigneeId: string,
    calc: SlaCalculation,
    dueDate: Date,
  ): void {
    this.eventEmitter.emit(
      SlaWarningEvent.eventName,
      new SlaWarningEvent({
        organizationId,
        actorType: "SYSTEM",
        caseId: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        assigneeId,
        hoursRemaining: calc.remainingHours,
        dueDate,
        threshold: calc.remainingHours <= 24 ? "WARNING_24H" : "WARNING_72H",
      }),
    );
    this.logger.debug(`Emitted SLA warning for case ${caseRecord.id}`);
  }

  /**
   * Emit SLA breach event for notification handling.
   * Notifies assignee and supervisor.
   *
   * @param organizationId - The organization ID
   * @param caseRecord - The case data
   * @param assigneeId - The current assignee's user ID
   * @param supervisorId - The supervisor's user ID (if available)
   * @param calc - The SLA calculation result
   */
  private emitBreachEvent(
    organizationId: string,
    caseRecord: { id: string; referenceNumber: string },
    assigneeId: string,
    supervisorId: string | undefined,
    calc: SlaCalculation,
  ): void {
    this.eventEmitter.emit(
      SlaBreachedEvent.eventName,
      new SlaBreachedEvent({
        organizationId,
        actorType: "SYSTEM",
        caseId: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        assigneeId,
        supervisorId,
        hoursOverdue: Math.abs(calc.remainingHours),
      }),
    );
    this.logger.debug(
      `Emitted SLA breach for case ${caseRecord.id}: ${Math.abs(calc.remainingHours).toFixed(1)}h overdue`,
    );
  }

  /**
   * Emit SLA critical event for notification handling.
   * Notifies assignee, supervisor, and compliance officer.
   *
   * @param organizationId - The organization ID
   * @param caseRecord - The case data
   * @param assigneeId - The current assignee's user ID
   * @param supervisorId - The supervisor's user ID (if available)
   * @param complianceOfficerId - The compliance officer's user ID
   * @param calc - The SLA calculation result
   */
  private emitCriticalEvent(
    organizationId: string,
    caseRecord: { id: string; referenceNumber: string },
    assigneeId: string,
    supervisorId: string | undefined,
    complianceOfficerId: string,
    calc: SlaCalculation,
  ): void {
    this.eventEmitter.emit(
      SlaCriticalEvent.eventName,
      new SlaCriticalEvent({
        organizationId,
        actorType: "SYSTEM",
        caseId: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        assigneeId,
        supervisorId,
        complianceOfficerId,
        hoursOverdue: Math.abs(calc.remainingHours),
      }),
    );
    this.logger.debug(
      `Emitted SLA critical for case ${caseRecord.id}: ${Math.abs(calc.remainingHours).toFixed(1)}h overdue`,
    );
  }

  /**
   * Find the supervisor of an assignee via Employee manager chain.
   * Links User to Employee via email, then follows managerId.
   *
   * @param organizationId - The organization ID
   * @param userId - The assignee's user ID
   * @returns Supervisor's user ID, or null if not found
   */
  private async findSupervisor(
    organizationId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    // Get user's email to match with Employee
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return null;

    // Find employee by email and get their manager
    const employee = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        email: user.email,
      },
      select: {
        manager: {
          select: { email: true },
        },
      },
    });
    if (!employee?.manager?.email) return null;

    // Find user with manager's email
    const supervisor = await this.prisma.user.findFirst({
      where: {
        organizationId,
        email: employee.manager.email,
        isActive: true,
      },
      select: { id: true },
    });
    return supervisor;
  }

  /**
   * Find the compliance officer for an organization.
   *
   * @param organizationId - The organization ID
   * @returns Compliance officer's user ID, or null if not found
   */
  private async findComplianceOfficer(
    organizationId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        organizationId,
        role: "COMPLIANCE_OFFICER",
        isActive: true,
      },
      select: { id: true },
    });
  }

  /**
   * Parse organization config JSON to typed CaseSlaConfig.
   *
   * @param configJson - The raw JSON config from Organization
   * @returns Typed CaseSlaConfig
   */
  private parseConfig(configJson: unknown): CaseSlaConfig {
    if (!configJson) {
      return DEFAULT_CASE_SLA_CONFIG;
    }
    return configJson as CaseSlaConfig;
  }
}

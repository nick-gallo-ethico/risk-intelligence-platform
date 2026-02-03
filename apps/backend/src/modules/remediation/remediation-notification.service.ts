import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StepStatus, RemediationStatus } from '@prisma/client';
import { EMAIL_QUEUE_NAME } from '../jobs/queues/email.queue';

/**
 * Notification configuration for remediation reminders.
 * Defines when pre-due and overdue reminders are sent.
 */
export interface ReminderConfig {
  /** Days before due date to send reminders */
  preDueReminders: number[];
  /** Days after due date to send overdue reminders */
  overdueReminders: number[];
  /** Days overdue before escalation to compliance officers */
  escalationThresholdDays: number;
}

/** Default reminder configuration */
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  preDueReminders: [3, 1], // 3 days and 1 day before
  overdueReminders: [3, 7], // 3 days and 7 days after
  escalationThresholdDays: 7, // Escalate after 7 days overdue
};

/**
 * Email template IDs for remediation notifications.
 */
export const REMEDIATION_EMAIL_TEMPLATES = {
  STEP_ASSIGNED: 'remediation-step-assigned',
  STEP_REMINDER_PRE_DUE: 'remediation-step-reminder-pre-due',
  STEP_REMINDER_OVERDUE: 'remediation-step-reminder-overdue',
  STEP_ESCALATION: 'remediation-step-escalation',
  STEP_COMPLETED_APPROVAL_NEEDED: 'remediation-step-completed-approval-needed',
  STEP_APPROVED: 'remediation-step-approved',
  PLAN_COMPLETED: 'remediation-plan-completed',
};

/**
 * Remediation Notification Service
 *
 * Handles all notification-related functionality for remediation plans:
 * - Step assignment notifications (internal and external)
 * - Pre-due reminder scheduling and sending
 * - Overdue reminder processing
 * - Escalation to compliance officers
 *
 * External contacts receive email notifications since they don't have system access.
 * Internal users receive both in-app and email notifications.
 */
@Injectable()
export class RemediationNotificationService {
  private readonly logger = new Logger(RemediationNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Notify assignee about a newly assigned step.
   * Sends email notification for both internal and external assignees.
   */
  async notifyStepAssigned(
    organizationId: string,
    stepId: string,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
      include: {
        plan: {
          include: {
            case: { select: { id: true, referenceNumber: true } },
          },
        },
      },
    });

    if (!step) {
      this.logger.warn(`Step not found for notification: ${stepId}`);
      return;
    }

    // Determine recipient email
    let recipientEmail: string | null = null;
    let recipientName: string | null = step.assigneeName;

    if (step.assigneeUserId) {
      // Internal user - get email from user record
      const user = await this.prisma.user.findUnique({
        where: { id: step.assigneeUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user) {
        recipientEmail = user.email;
        recipientName = recipientName || `${user.firstName} ${user.lastName}`;
      }
    } else if (step.assigneeEmail) {
      // External contact
      recipientEmail = step.assigneeEmail;
    }

    if (!recipientEmail) {
      this.logger.warn(`No recipient email for step assignment: ${stepId}`);
      return;
    }

    await this.emailQueue.add(
      'remediation-assignment',
      {
        organizationId,
        templateId: REMEDIATION_EMAIL_TEMPLATES.STEP_ASSIGNED,
        to: recipientEmail,
        context: {
          recipientName,
          stepTitle: step.title,
          stepDescription: step.description,
          planTitle: step.plan.title,
          caseNumber: step.plan.case?.referenceNumber,
          dueDate: step.dueDate?.toISOString(),
          isExternal: !step.assigneeUserId,
        },
      },
      { priority: 2 },
    );

    this.logger.log(`Queued assignment notification for step ${stepId}`);
  }

  /**
   * Schedule pre-due and overdue reminders for a step.
   * Called when a step is created or its due date changes.
   */
  async scheduleReminders(
    organizationId: string,
    stepId: string,
    config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
    });

    if (!step || !step.dueDate) {
      this.logger.debug(`No due date for step ${stepId}, skipping reminders`);
      return;
    }

    const now = new Date();
    const dueDate = new Date(step.dueDate);

    // Schedule pre-due reminders
    for (const daysBeforeDue of config.preDueReminders) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - daysBeforeDue);

      if (reminderDate > now) {
        const delay = reminderDate.getTime() - now.getTime();
        await this.emailQueue.add(
          'remediation-reminder',
          {
            organizationId,
            stepId,
            reminderType: 'pre-due',
            daysUntilDue: daysBeforeDue,
          },
          {
            delay,
            jobId: `reminder-predue-${stepId}-${daysBeforeDue}`,
            removeOnComplete: true,
          },
        );
        this.logger.debug(
          `Scheduled pre-due reminder for step ${stepId} in ${daysBeforeDue} days before due`,
        );
      }
    }

    // Schedule overdue reminders
    for (const daysAfterDue of config.overdueReminders) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() + daysAfterDue);

      if (reminderDate > now) {
        const delay = reminderDate.getTime() - now.getTime();
        await this.emailQueue.add(
          'remediation-reminder',
          {
            organizationId,
            stepId,
            reminderType: 'overdue',
            daysOverdue: daysAfterDue,
          },
          {
            delay,
            jobId: `reminder-overdue-${stepId}-${daysAfterDue}`,
            removeOnComplete: true,
          },
        );
        this.logger.debug(
          `Scheduled overdue reminder for step ${stepId} ${daysAfterDue} days after due`,
        );
      }
    }

    // Schedule escalation
    const escalationDate = new Date(dueDate);
    escalationDate.setDate(
      escalationDate.getDate() + config.escalationThresholdDays,
    );

    if (escalationDate > now) {
      const delay = escalationDate.getTime() - now.getTime();
      await this.emailQueue.add(
        'remediation-escalation',
        {
          organizationId,
          stepId,
        },
        {
          delay,
          jobId: `escalation-${stepId}`,
          removeOnComplete: true,
        },
      );
      this.logger.debug(
        `Scheduled escalation for step ${stepId} at ${config.escalationThresholdDays} days overdue`,
      );
    }
  }

  /**
   * Cancel all scheduled reminders for a step.
   * Called when a step is completed or skipped.
   */
  async cancelReminders(stepId: string): Promise<void> {
    // Remove all scheduled reminder jobs for this step
    const jobsToRemove = [
      `reminder-predue-${stepId}-3`,
      `reminder-predue-${stepId}-1`,
      `reminder-overdue-${stepId}-3`,
      `reminder-overdue-${stepId}-7`,
      `escalation-${stepId}`,
    ];

    for (const jobId of jobsToRemove) {
      try {
        const job = await this.emailQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.debug(`Removed scheduled job: ${jobId}`);
        }
      } catch (error) {
        // Job may already be removed or processed
        this.logger.debug(`Could not remove job ${jobId}: ${error}`);
      }
    }

    this.logger.log(`Cancelled reminders for step ${stepId}`);
  }

  /**
   * Process a reminder job - send the actual reminder email.
   * Called by the job processor when a scheduled reminder fires.
   */
  async processReminder(
    organizationId: string,
    stepId: string,
    reminderType: 'pre-due' | 'overdue',
    days: number,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
      include: {
        plan: {
          include: {
            case: { select: { id: true, referenceNumber: true } },
          },
        },
      },
    });

    if (!step) {
      this.logger.warn(`Step not found for reminder: ${stepId}`);
      return;
    }

    // Don't send reminders for completed or skipped steps
    if (
      step.status === StepStatus.COMPLETED ||
      step.status === StepStatus.SKIPPED
    ) {
      this.logger.debug(
        `Skipping reminder for completed/skipped step: ${stepId}`,
      );
      return;
    }

    // Determine recipient
    let recipientEmail: string | null = null;
    let recipientName: string | null = step.assigneeName;

    if (step.assigneeUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: step.assigneeUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user) {
        recipientEmail = user.email;
        recipientName = recipientName || `${user.firstName} ${user.lastName}`;
      }
    } else if (step.assigneeEmail) {
      recipientEmail = step.assigneeEmail;
    }

    if (!recipientEmail) {
      this.logger.warn(`No recipient email for reminder: ${stepId}`);
      return;
    }

    const templateId =
      reminderType === 'pre-due'
        ? REMEDIATION_EMAIL_TEMPLATES.STEP_REMINDER_PRE_DUE
        : REMEDIATION_EMAIL_TEMPLATES.STEP_REMINDER_OVERDUE;

    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        templateId,
        to: recipientEmail,
        context: {
          recipientName,
          stepTitle: step.title,
          planTitle: step.plan.title,
          caseNumber: step.plan.case?.referenceNumber,
          dueDate: step.dueDate?.toISOString(),
          reminderType,
          days,
          isOverdue: reminderType === 'overdue',
        },
      },
      { priority: 2 },
    );

    // Update step to track reminder sent
    await this.prisma.remediationStep.update({
      where: { id: stepId },
      data: { reminderSentAt: new Date() },
    });

    this.logger.log(
      `Sent ${reminderType} reminder for step ${stepId} (${days} days)`,
    );
  }

  /**
   * Process an escalation - notify compliance officers of overdue step.
   * Called by the job processor when an escalation threshold is reached.
   */
  async processEscalation(
    organizationId: string,
    stepId: string,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
      include: {
        plan: {
          include: {
            case: { select: { id: true, referenceNumber: true } },
          },
        },
      },
    });

    if (!step) {
      this.logger.warn(`Step not found for escalation: ${stepId}`);
      return;
    }

    // Don't escalate completed or skipped steps
    if (
      step.status === StepStatus.COMPLETED ||
      step.status === StepStatus.SKIPPED
    ) {
      this.logger.debug(
        `Skipping escalation for completed/skipped step: ${stepId}`,
      );
      return;
    }

    // Find compliance officers in the organization
    const complianceOfficers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMIN'] },
        isActive: true,
      },
      select: { email: true, firstName: true, lastName: true },
    });

    if (complianceOfficers.length === 0) {
      this.logger.warn(
        `No compliance officers found for organization: ${organizationId}`,
      );
      return;
    }

    const recipientEmails = complianceOfficers.map((u) => u.email);

    // Calculate days overdue
    const daysOverdue = step.dueDate
      ? Math.floor(
          (new Date().getTime() - new Date(step.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    // Get assignee info
    let assigneeName = step.assigneeName;
    if (step.assigneeUserId && !assigneeName) {
      const user = await this.prisma.user.findUnique({
        where: { id: step.assigneeUserId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        assigneeName = `${user.firstName} ${user.lastName}`;
      }
    }

    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        templateId: REMEDIATION_EMAIL_TEMPLATES.STEP_ESCALATION,
        to: recipientEmails,
        context: {
          stepTitle: step.title,
          stepDescription: step.description,
          planTitle: step.plan.title,
          caseNumber: step.plan.case?.referenceNumber,
          assigneeName: assigneeName || step.assigneeEmail || 'Unassigned',
          dueDate: step.dueDate?.toISOString(),
          daysOverdue,
        },
      },
      { priority: 1 }, // High priority for escalations
    );

    // Update step to track escalation
    await this.prisma.remediationStep.update({
      where: { id: stepId },
      data: { escalatedAt: new Date() },
    });

    this.logger.log(
      `Escalated overdue step ${stepId} to ${recipientEmails.length} compliance officers`,
    );
  }

  /**
   * Notify compliance officers when a step requiring approval is completed.
   */
  async notifyStepCompletedForApproval(
    organizationId: string,
    stepId: string,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
      include: {
        plan: {
          include: {
            case: { select: { id: true, referenceNumber: true } },
          },
        },
      },
    });

    if (!step || !step.requiresCoApproval) {
      return;
    }

    // Find compliance officers
    const complianceOfficers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMIN'] },
        isActive: true,
      },
      select: { email: true },
    });

    if (complianceOfficers.length === 0) {
      return;
    }

    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        templateId: REMEDIATION_EMAIL_TEMPLATES.STEP_COMPLETED_APPROVAL_NEEDED,
        to: complianceOfficers.map((u) => u.email),
        context: {
          stepTitle: step.title,
          planTitle: step.plan.title,
          caseNumber: step.plan.case?.referenceNumber,
          completionNotes: step.completionNotes,
        },
      },
      { priority: 2 },
    );

    this.logger.log(`Notified COs about step completion for approval: ${stepId}`);
  }

  /**
   * Notify step assignee when their step has been approved.
   */
  async notifyStepApproved(
    organizationId: string,
    stepId: string,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: stepId, organizationId },
      include: {
        plan: {
          include: {
            case: { select: { id: true, referenceNumber: true } },
          },
        },
      },
    });

    if (!step) {
      return;
    }

    // Determine recipient
    let recipientEmail: string | null = null;
    let recipientName: string | null = step.assigneeName;

    if (step.assigneeUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: step.assigneeUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user) {
        recipientEmail = user.email;
        recipientName = recipientName || `${user.firstName} ${user.lastName}`;
      }
    } else if (step.assigneeEmail) {
      recipientEmail = step.assigneeEmail;
    }

    if (!recipientEmail) {
      return;
    }

    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        templateId: REMEDIATION_EMAIL_TEMPLATES.STEP_APPROVED,
        to: recipientEmail,
        context: {
          recipientName,
          stepTitle: step.title,
          planTitle: step.plan.title,
          caseNumber: step.plan.case?.referenceNumber,
          approvalNotes: step.approvalNotes,
        },
      },
      { priority: 3 },
    );

    this.logger.log(`Notified assignee about step approval: ${stepId}`);
  }

  /**
   * Notify case owner when a remediation plan is completed.
   */
  async notifyPlanCompleted(
    organizationId: string,
    planId: string,
  ): Promise<void> {
    const plan = await this.prisma.remediationPlan.findFirst({
      where: { id: planId, organizationId },
      include: {
        case: {
          select: { id: true, referenceNumber: true },
        },
      },
    });

    if (!plan) {
      return;
    }

    // Get plan owner email (the remediation plan owner, not case assignee)
    const owner = await this.prisma.user.findUnique({
      where: { id: plan.ownerId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!owner) {
      return;
    }

    await this.emailQueue.add(
      'send-email',
      {
        organizationId,
        templateId: REMEDIATION_EMAIL_TEMPLATES.PLAN_COMPLETED,
        to: owner.email,
        context: {
          recipientName: `${owner.firstName} ${owner.lastName}`,
          planTitle: plan.title,
          caseNumber: plan.case?.referenceNumber,
          completedSteps: plan.completedSteps,
          totalSteps: plan.totalSteps,
        },
      },
      { priority: 3 },
    );

    this.logger.log(`Notified case owner about plan completion: ${planId}`);
  }

  /**
   * Bulk check for overdue steps that need escalation.
   * Can be called by a scheduled job to catch any missed escalations.
   */
  async checkOverdueSteps(organizationId?: string): Promise<number> {
    const now = new Date();
    const escalationThreshold = new Date();
    escalationThreshold.setDate(
      escalationThreshold.getDate() - DEFAULT_REMINDER_CONFIG.escalationThresholdDays,
    );

    // Find overdue steps that haven't been escalated
    const overdueSteps = await this.prisma.remediationStep.findMany({
      where: {
        ...(organizationId && { organizationId }),
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
        dueDate: { lt: escalationThreshold },
        escalatedAt: null,
        plan: {
          status: RemediationStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    // Queue escalations
    for (const step of overdueSteps) {
      await this.emailQueue.add(
        'remediation-escalation',
        {
          organizationId: step.organizationId,
          stepId: step.id,
        },
        { priority: 1 },
      );
    }

    this.logger.log(`Found ${overdueSteps.length} steps needing escalation`);
    return overdueSteps.length;
  }
}

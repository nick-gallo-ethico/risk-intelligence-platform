/**
 * ActivityLogService
 *
 * Manages activity logging for implementation projects.
 * Supports email (sent/received), meeting, decision, and note types.
 *
 * Per CONTEXT.md:
 * - Native email from portal (logEmailSent)
 * - Inbound logging via BCC (logEmailReceived)
 * - Meeting notes with attendees
 * - Decision tracking with rationale
 *
 * @see CONTEXT.md for Implementation Specialists requirements
 * @see implementation.types.ts for ActivityType enum
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ImplActivityType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Input DTO for logging a generic activity
 */
export interface LogActivityDto {
  projectId: string;
  type: ImplActivityType;
  subject?: string;
  content?: string;
  // Email fields
  emailTo?: string[];
  emailCc?: string[];
  emailMessageId?: string;
  // Meeting fields
  attendees?: string[];
  meetingDate?: Date;
  // Decision fields
  decisionRationale?: string;
}

/**
 * Response type for activity
 */
export interface ActivityLogEntry {
  id: string;
  projectId: string;
  type: ImplActivityType;
  subject: string | null;
  content: string | null;
  attendees: string[];
  meetingDate: Date | null;
  decisionRationale: string | null;
  emailTo: string[];
  emailCc: string[];
  emailMessageId: string | null;
  isAutoLogged: boolean;
  createdById: string;
  createdAt: Date;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a generic activity (email, meeting, decision, note).
   *
   * @param dto - Activity details
   * @param createdById - Internal user ID who created this activity
   * @returns Created activity
   */
  async logActivity(
    dto: LogActivityDto,
    createdById: string,
  ): Promise<ActivityLogEntry> {
    // Verify project exists
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException("Implementation project not found");
    }

    const activity = await this.prisma.implementationActivity.create({
      data: {
        projectId: dto.projectId,
        type: dto.type,
        subject: dto.subject,
        content: dto.content,
        emailTo: dto.emailTo || [],
        emailCc: dto.emailCc || [],
        emailMessageId: dto.emailMessageId,
        attendees: dto.attendees || [],
        meetingDate: dto.meetingDate,
        decisionRationale: dto.decisionRationale,
        isAutoLogged: false,
        createdById,
      },
    });

    this.logger.debug(
      `Activity logged for project ${dto.projectId}: ${dto.type}`,
    );

    return activity;
  }

  /**
   * Log email sent from portal (native email per CONTEXT.md).
   *
   * @param projectId - Implementation project ID
   * @param to - Email recipients
   * @param cc - CC recipients
   * @param subject - Email subject
   * @param body - Email body
   * @param messageId - Email message ID for threading
   * @param createdById - Internal user ID who sent the email
   * @returns Created activity
   */
  async logEmailSent(
    projectId: string,
    to: string[],
    cc: string[],
    subject: string,
    body: string,
    messageId: string,
    createdById: string,
  ): Promise<ActivityLogEntry> {
    return this.logActivity(
      {
        projectId,
        type: ImplActivityType.EMAIL_SENT,
        subject,
        content: body,
        emailTo: to,
        emailCc: cc,
        emailMessageId: messageId,
      },
      createdById,
    );
  }

  /**
   * Log email received via BCC (inbound logging per CONTEXT.md).
   *
   * This is typically called from an email processing webhook
   * when an email is BCCed to the implementation inbox.
   *
   * @param projectId - Implementation project ID
   * @param from - Sender email address
   * @param subject - Email subject
   * @param body - Email body
   * @param messageId - Email message ID for threading
   * @returns Created activity
   */
  async logEmailReceived(
    projectId: string,
    from: string,
    subject: string,
    body: string,
    messageId: string,
  ): Promise<ActivityLogEntry> {
    // Verify project exists
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Implementation project not found");
    }

    const activity = await this.prisma.implementationActivity.create({
      data: {
        projectId,
        type: ImplActivityType.EMAIL_RECEIVED,
        subject: `From: ${from} - ${subject}`,
        content: body,
        emailMessageId: messageId,
        emailTo: [],
        emailCc: [],
        attendees: [],
        isAutoLogged: true, // Auto-logged from BCC
        createdById: "SYSTEM",
      },
    });

    this.logger.debug(
      `Received email logged for project ${projectId} from ${from}`,
    );

    return activity;
  }

  /**
   * Log a meeting with attendees.
   *
   * @param projectId - Implementation project ID
   * @param title - Meeting title
   * @param notes - Meeting notes
   * @param attendees - List of attendee names/emails
   * @param meetingDate - Date/time of meeting
   * @param createdById - Internal user ID who logged the meeting
   * @returns Created activity
   */
  async logMeeting(
    projectId: string,
    title: string,
    notes: string,
    attendees: string[],
    meetingDate: Date,
    createdById: string,
  ): Promise<ActivityLogEntry> {
    return this.logActivity(
      {
        projectId,
        type: ImplActivityType.MEETING,
        subject: title,
        content: notes,
        attendees,
        meetingDate,
      },
      createdById,
    );
  }

  /**
   * Log a decision with rationale.
   *
   * @param projectId - Implementation project ID
   * @param decision - Decision summary
   * @param rationale - Reasoning behind the decision
   * @param createdById - Internal user ID who logged the decision
   * @returns Created activity
   */
  async logDecision(
    projectId: string,
    decision: string,
    rationale: string,
    createdById: string,
  ): Promise<ActivityLogEntry> {
    return this.logActivity(
      {
        projectId,
        type: ImplActivityType.DECISION,
        subject: decision,
        decisionRationale: rationale,
      },
      createdById,
    );
  }

  /**
   * Log a general note.
   *
   * @param projectId - Implementation project ID
   * @param title - Note title (optional)
   * @param content - Note content
   * @param createdById - Internal user ID who created the note
   * @returns Created activity
   */
  async logNote(
    projectId: string,
    title: string | undefined,
    content: string,
    createdById: string,
  ): Promise<ActivityLogEntry> {
    return this.logActivity(
      {
        projectId,
        type: ImplActivityType.NOTE,
        subject: title,
        content,
      },
      createdById,
    );
  }

  /**
   * Get activity timeline for a project.
   *
   * @param projectId - Implementation project ID
   * @param limit - Maximum number of activities to return
   * @param type - Optional filter by activity type
   * @returns List of activities ordered by creation date (newest first)
   */
  async getActivityTimeline(
    projectId: string,
    limit: number = 50,
    type?: ImplActivityType,
  ): Promise<ActivityLogEntry[]> {
    return this.prisma.implementationActivity.findMany({
      where: {
        projectId,
        ...(type && { type }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get a single activity by ID.
   *
   * @param activityId - Activity ID
   * @returns Activity or throws NotFoundException
   */
  async getActivity(activityId: string): Promise<ActivityLogEntry> {
    const activity = await this.prisma.implementationActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    return activity;
  }
}

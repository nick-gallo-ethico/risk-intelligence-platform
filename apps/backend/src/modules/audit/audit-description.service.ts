import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Service for building natural language descriptions of audit events.
 *
 * All descriptions are human-readable and include actor names (not IDs).
 * This supports both compliance reporting and AI context building.
 */
@Injectable()
export class AuditDescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Case Event Descriptions
  // ===========================================

  async buildCaseCreatedDescription(event: {
    actorUserId: string | null;
    caseId: string;
    referenceNumber: string;
    sourceChannel: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    return `${actor} created case ${event.referenceNumber} via ${event.sourceChannel}`;
  }

  async buildCaseAssignedDescription(event: {
    actorUserId: string | null;
    caseId: string;
    previousAssigneeId: string | null;
    newAssigneeId: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    const newAssignee = await this.getActorName(event.newAssigneeId);

    if (event.previousAssigneeId) {
      const previousAssignee = await this.getActorName(
        event.previousAssigneeId,
      );
      return `${actor} reassigned case from ${previousAssignee} to ${newAssignee}`;
    }
    return `${actor} assigned case to ${newAssignee}`;
  }

  async buildCaseStatusChangedDescription(event: {
    actorUserId: string | null;
    referenceNumber?: string;
    previousStatus: string;
    newStatus: string;
    rationale?: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    const caseRef = event.referenceNumber
      ? ` for case ${event.referenceNumber}`
      : "";
    const base = `${actor} changed case status from ${event.previousStatus} to ${event.newStatus}${caseRef}`;
    return event.rationale ? `${base}: "${event.rationale}"` : base;
  }

  async buildCaseUpdatedDescription(event: {
    actorUserId: string | null;
    changes: Record<string, { old: unknown; new: unknown }>;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    const fields = Object.keys(event.changes).join(", ");
    return `${actor} updated case fields: ${fields}`;
  }

  async buildCaseViewedDescription(event: {
    actorUserId: string | null;
    referenceNumber: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    return `${actor} viewed case ${event.referenceNumber}`;
  }

  // ===========================================
  // Investigation Event Descriptions
  // ===========================================

  async buildInvestigationCreatedDescription(event: {
    actorUserId: string | null;
    investigationId: string;
    caseId: string;
    investigationNumber: number;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    return `${actor} created investigation #${event.investigationNumber} on case`;
  }

  async buildInvestigationStatusChangedDescription(event: {
    actorUserId: string | null;
    previousStatus: string;
    newStatus: string;
    rationale?: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    const base = `${actor} changed investigation status from ${event.previousStatus} to ${event.newStatus}`;
    return event.rationale ? `${base}: "${event.rationale}"` : base;
  }

  async buildInvestigationAssignedDescription(event: {
    actorUserId: string | null;
    previousInvestigatorId: string | null;
    newInvestigatorId: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    const newInvestigator = await this.getActorName(event.newInvestigatorId);

    if (event.previousInvestigatorId) {
      const previousInvestigator = await this.getActorName(
        event.previousInvestigatorId,
      );
      return `${actor} reassigned investigation from ${previousInvestigator} to ${newInvestigator}`;
    }
    return `${actor} assigned investigation to ${newInvestigator}`;
  }

  // ===========================================
  // RIU Event Descriptions
  // ===========================================

  async buildRiuCreatedDescription(event: {
    actorUserId: string | null;
    riuId: string;
    referenceNumber: string;
    type: string;
    sourceChannel: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    return `${actor} created RIU ${event.referenceNumber} (${event.type}) via ${event.sourceChannel}`;
  }

  async buildRiuViewedDescription(event: {
    actorUserId: string | null;
    referenceNumber: string;
  }): Promise<string> {
    const actor = await this.getActorName(event.actorUserId);
    return `${actor} viewed RIU ${event.referenceNumber}`;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Gets the display name for a user ID.
   * Returns "System" for null/undefined user IDs.
   * Returns "Unknown User" if user not found.
   */
  private async getActorName(userId: string | null): Promise<string> {
    if (!userId) return "System";

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
    } catch {
      return "Unknown User";
    }
  }
}

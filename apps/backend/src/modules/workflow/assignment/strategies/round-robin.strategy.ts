import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import {
  AssignmentStrategy,
  AssignmentContext,
  AssignmentResult,
} from "./base.strategy";

/**
 * Configuration for round-robin assignment strategy.
 */
export interface RoundRobinConfig {
  /** Team ID to limit assignments to (optional) */
  teamId?: string;

  /** Role filter - only consider users with these roles */
  roleFilter?: UserRole[];
}

/**
 * RoundRobinStrategy distributes assignments fairly among eligible users.
 *
 * Implementation:
 * - Gets list of eligible users based on role filters
 * - Finds the last user who was assigned a similar entity type
 * - Assigns to the next user in the list (wrapping around)
 *
 * This ensures fair distribution over time.
 */
@Injectable()
export class RoundRobinStrategy extends AssignmentStrategy {
  readonly type = "round_robin";

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async resolve(
    context: AssignmentContext,
    config: RoundRobinConfig
  ): Promise<AssignmentResult | null> {
    // Get eligible users
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        ...(config.roleFilter && {
          role: { in: config.roleFilter },
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: "asc" }, // Consistent ordering for round-robin
    });

    if (users.length === 0) {
      return null;
    }

    // Find last assigned user for this entity type by checking audit logs
    const lastAssignment = await this.prisma.auditLog.findFirst({
      where: {
        organizationId: context.organizationId,
        entityType: context.entityType as "CASE" | "INVESTIGATION",
        action: "assigned",
      },
      orderBy: { createdAt: "desc" },
      select: { changes: true },
    });

    // Determine next index
    let nextIndex = 0;
    if (lastAssignment?.changes) {
      const changes = lastAssignment.changes as Record<string, unknown>;
      const assignedTo = changes.assignedTo as
        | { new?: string }
        | undefined;
      const lastUserId = assignedTo?.new;

      if (lastUserId) {
        const lastIndex = users.findIndex((u) => u.id === lastUserId);
        if (lastIndex >= 0) {
          nextIndex = (lastIndex + 1) % users.length;
        }
      }
    }

    const assignee = users[nextIndex];

    return {
      userId: assignee.id,
      reason: `Round-robin assignment to ${assignee.firstName} ${assignee.lastName}`,
    };
  }
}
